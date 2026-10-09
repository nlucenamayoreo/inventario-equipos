"""Seguridad: rol y permisos del operador en cada petición, gestión de roles y de personas con acceso."""

from __future__ import annotations

from dataclasses import replace
from typing import Any

from application.dto.principal import Principal
from application.ports.app_unit_of_work import UnitOfWorkFactory
from application.ports.seguridad import DirectorioIdentidad
from application.use_cases.common import correo, operador, parse_id, require, texto
from domain.entities.seguridad import GRUPO_SUPERADMIN, ROL_SUPERADMIN, SEGURIDAD, Operador, Permiso, Rol
from domain.exceptions import BusinessRuleViolation, ConflictError, NotFoundError, ValidationError


class _Base:
    def __init__(self, uow_factory: UnitOfWorkFactory) -> None:
        self._uow_factory = uow_factory


def _nombre_de(principal: Principal) -> str:
    claims = principal.claims
    nombre = claims.get("name") or " ".join(
        p for p in (claims.get("given_name"), claims.get("family_name")) if p
    )
    return nombre or principal.email or principal.subject


class ResolveOperadorUseCase(_Base):
    """Completa el principal con su operador, rol y permisos (en cada petición: los cambios aplican ya).

    - Grupo de Cognito ``admin_ti``: superadministrador; si aún no es operador se registra así (arranque).
    - Operador desactivado: sin acceso a ninguna operación.
    - Cuenta sin operador: solo lectura.
    """

    def execute(self, principal: Principal) -> Principal:
        grupo_admin = principal.has_group(GRUPO_SUPERADMIN)
        if not principal.email:
            return replace(principal, superadmin=grupo_admin, rol=ROL_SUPERADMIN if grupo_admin else None)
        with self._uow_factory(None) as uow:
            persona = uow.seguridad.operador_por_correo(principal.email)
            if persona is None and grupo_admin:
                rol = uow.seguridad.rol_por_nombre(ROL_SUPERADMIN)
                persona = uow.seguridad.create_operador(
                    principal.email.lower(), _nombre_de(principal), rol.id, "sistema"
                )
                persona = uow.seguridad.operador_por_correo(principal.email)
                uow.commit()
        if persona is None:
            return replace(principal, rol="Visitante")
        return replace(
            principal,
            operador_id=persona.id,
            rol=persona.rol_nombre,
            permisos=frozenset(persona.permisos),
            superadmin=grupo_admin or persona.rol_es_sistema,
            activo=grupo_admin or persona.activo,
        )


def vista_sesion(principal: Principal, permisos_sistema: list[Permiso]) -> dict:
    """Lo que la interfaz necesita para mostrar u ocultar vistas y acciones."""
    permisos = [p.codigo for p in permisos_sistema] if principal.superadmin else sorted(principal.permisos)
    return {
        "correo": principal.email or "",
        "nombre": _nombre_de(principal),
        "rol": principal.rol or "Visitante",
        "operadorId": principal.operador_id,
        "superadmin": principal.superadmin,
        "activo": principal.activo,
        "permisos": permisos if principal.activo else [],
    }


class ListPermisosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Permiso]:
        with self._uow_factory(principal) as uow:
            return uow.seguridad.list_permisos()


class ListRolesUseCase(_Base):
    def execute(self, principal: Principal) -> list[Rol]:
        with self._uow_factory(principal) as uow:
            return uow.seguridad.list_roles()


def _permisos(body: dict[str, Any], validos: set[str]) -> list[str]:
    raw = body.get("permisos") or []
    if not isinstance(raw, list) or any(p not in validos for p in raw):
        raise ValidationError("Permisos no válidos.", details={"field": "permisos"})
    return sorted(set(raw))


class CreateRolUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Rol:
        require(principal, SEGURIDAD)
        nombre = texto(body.get("nombre"), "nombre", "Indique el nombre del rol.", maximo=80)
        descripcion = texto(body.get("descripcion"), "descripcion", "", requerido=False, maximo=300)
        with self._uow_factory(principal) as uow:
            permisos = _permisos(body, {p.codigo for p in uow.seguridad.list_permisos()})
            if uow.seguridad.rol_por_nombre(nombre):
                raise ConflictError(f"El rol {nombre} ya existe.")
            rol = uow.seguridad.create_rol(nombre, descripcion, permisos)
            uow.commit()
            return rol


class UpdateRolUseCase(_Base):
    def execute(self, principal: Principal, rol_raw: str, body: dict[str, Any]) -> Rol:
        require(principal, SEGURIDAD)
        rol_id = parse_id(rol_raw, "rolId")
        with self._uow_factory(principal) as uow:
            rol = uow.seguridad.get_rol(rol_id)
            if rol is None:
                raise NotFoundError("El rol no existe.")
            if rol.es_sistema:
                raise BusinessRuleViolation("El rol Superadministrador no se puede modificar.")
            nombre = texto(body.get("nombre", rol.nombre), "nombre", "Indique el nombre del rol.", maximo=80)
            descripcion = texto(
                body.get("descripcion", rol.descripcion), "descripcion", "", requerido=False, maximo=300
            )
            otro = uow.seguridad.rol_por_nombre(nombre)
            if otro and otro.id != rol_id:
                raise ConflictError(f"El rol {nombre} ya existe.")
            activo = body.get("activo", rol.activo)
            if not isinstance(activo, bool):
                raise ValidationError("'activo' debe ser verdadero o falso.", details={"field": "activo"})
            permisos = (
                _permisos(body, {p.codigo for p in uow.seguridad.list_permisos()})
                if "permisos" in body
                else list(rol.permisos)
            )
            rol = uow.seguridad.update_rol(rol_id, nombre, descripcion, activo, permisos)
            uow.commit()
            return rol


class ListOperadoresUseCase(_Base):
    """Personas con acceso (todas las vistas las necesitan para elegir el responsable del resguardo)."""

    def execute(self, principal: Principal) -> list[Operador]:
        with self._uow_factory(principal) as uow:
            return uow.seguridad.list_operadores()


class InviteOperadorUseCase(_Base):
    """Da acceso a una persona: queda registrada con su rol y recibe la contraseña temporal por correo."""

    def __init__(self, uow_factory: UnitOfWorkFactory, directorio: DirectorioIdentidad) -> None:
        super().__init__(uow_factory)
        self._directorio = directorio

    def execute(self, principal: Principal, body: dict[str, Any]) -> Operador:
        require(principal, SEGURIDAD)
        mail = correo(body.get("correo"))
        if mail is None:
            raise ValidationError("Indique el correo de la persona.", details={"field": "correo"})
        nombre = texto(body.get("nombre"), "nombre", "Indique el nombre de la persona.", maximo=150)
        if body.get("rolId") in (None, ""):
            raise ValidationError("Seleccione el rol.", details={"field": "rolId"})
        rol_id = parse_id(body.get("rolId"), "rolId")
        with self._uow_factory(principal) as uow:
            rol = uow.seguridad.get_rol(rol_id)
            if rol is None or not rol.activo:
                raise ValidationError("Seleccione un rol válido.", details={"field": "rolId"})
            if rol.es_sistema and not principal.superadmin:
                raise BusinessRuleViolation("Solo un superadministrador puede dar el rol Superadministrador.")
            if uow.seguridad.operador_por_correo(mail):
                raise ConflictError(f"{mail} ya tiene acceso.")
            persona = uow.seguridad.create_operador(mail, nombre, rol_id, operador(principal))
            self._directorio.invitar(mail, nombre, principal.claims.get("iss"))
            uow.commit()
            return persona


class UpdateOperadorUseCase(_Base):
    """Cambiar nombre, rol o activar/desactivar el acceso de una persona."""

    def execute(self, principal: Principal, operador_raw: str, body: dict[str, Any]) -> Operador:
        require(principal, SEGURIDAD)
        operador_id = parse_id(operador_raw, "operadorId")
        with self._uow_factory(principal) as uow:
            persona = uow.seguridad.get_operador(operador_id)
            if persona is None:
                raise NotFoundError("La persona no existe.")
            nombre = texto(body.get("nombre", persona.nombre), "nombre", "Indique el nombre.", maximo=150)
            rol_id = parse_id(body.get("rolId", persona.rol_id), "rolId")
            activo = body.get("activo", persona.activo)
            if not isinstance(activo, bool):
                raise ValidationError("'activo' debe ser verdadero o falso.", details={"field": "activo"})
            if operador_id == principal.operador_id and (not activo or rol_id != persona.rol_id):
                raise BusinessRuleViolation("No puede cambiar su propio rol ni desactivar su propio acceso.")
            rol = uow.seguridad.get_rol(rol_id)
            if rol is None:
                raise ValidationError("Seleccione un rol válido.", details={"field": "rolId"})
            if (rol.es_sistema or persona.rol_es_sistema) and not principal.superadmin:
                raise BusinessRuleViolation("Solo un superadministrador gestiona superadministradores.")
            persona = uow.seguridad.update_operador(operador_id, nombre, rol_id, activo)
            uow.commit()
            return persona
