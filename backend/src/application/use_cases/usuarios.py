"""Casos de uso de colaboradores: alta, edición, vacaciones, desactivación y baja lógica."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime
from typing import Any

from application.dto.principal import Principal
from application.ports.app_unit_of_work import AppUnitOfWork, UnitOfWorkFactory
from application.use_cases.common import (
    correo,
    custodio,
    fecha,
    operador,
    parse_id,
    parse_id_opcional,
    registrar,
    require,
    texto,
    validar_limite,
)
from domain.entities.activos import EstadoActivo
from domain.entities.catalogos import Articulo
from domain.entities.seguridad import USUARIOS
from domain.entities.usuarios import AccionVacacion, EstadoUsuario, ResultadoBaja, Usuario
from domain.exceptions import BusinessRuleViolation, ConflictError, NotFoundError, ValidationError


class _Base:
    def __init__(self, uow_factory: UnitOfWorkFactory) -> None:
        self._uow_factory = uow_factory


def _get(uow: AppUnitOfWork, usuario_id: int) -> Usuario:
    usuario = uow.usuarios.get(usuario_id)
    if usuario is None:
        raise NotFoundError("El usuario no existe.")
    return usuario


def _validar_unicos(uow: AppUnitOfWork, codigo: str | None, mail: str | None, excluir: int | None) -> None:
    if codigo is not None:
        estado = uow.usuarios.estado_por_codigo(codigo, excluir)
        if estado is not None:
            sufijo = " (eliminado)" if estado is EstadoUsuario.ELIMINADO else ""
            raise ConflictError(
                f"Ya existe un usuario con el código {codigo}{sufijo}.", code="codigo_duplicado"
            )
    if mail is not None and uow.usuarios.correo_en_uso(mail, excluir):
        raise ConflictError(f"El correo {mail} ya está registrado.", code="correo_duplicado")


def _validar_cargo_depto(uow: AppUnitOfWork, cargo_id: int | None, departamento_id: int | None) -> None:
    if cargo_id is not None and uow.catalogos.get_cargo(cargo_id) is None:
        raise ValidationError("Seleccione un cargo válido.", details={"field": "cargoId"})
    if departamento_id is not None and not uow.catalogos.departamento_existe(departamento_id):
        raise ValidationError("Seleccione un departamento válido.", details={"field": "departamentoId"})


def alta_usuario(
    uow: AppUnitOfWork, codigo: str, nombre: str, mail: str | None, cargo_id: int, departamento_id: int
) -> Usuario:
    """Regla común del alta individual y la carga masiva."""
    _validar_unicos(uow, codigo, mail, None)
    _validar_cargo_depto(uow, cargo_id, departamento_id)
    return uow.usuarios.create(codigo, nombre, mail, cargo_id, departamento_id)


def retirar_de_servicio(
    uow: AppUnitOfWork, usuario_id: int, destino: EstadoActivo, motivo: str, quien: str, custodio_id: int
) -> ResultadoBaja:
    """Efectos comunes de la baja y la desactivación sobre equipos y vacaciones.

    - Activos con titular → ``destino`` (``disponible`` limpia el titular;
      ``pendiente_recuperacion`` lo conserva).
    - Activos que tenía en préstamo de otro titular → ``en_resguardo`` (vuelven a TI).
    - Vacaciones abiertas donde era suplente → acción ``resguardo``; su propia vacación abierta se cierra.
    """
    liberados = devueltos = 0
    for activo in uow.activos.de_titular(usuario_id):
        if activo.estado is destino:
            continue
        titular = None if destino is EstadoActivo.DISPONIBLE else usuario_id
        registrar(uow, activo, activo.mover(destino, titular=titular, custodio_id=custodio_id), motivo, quien)
        liberados += 1
    for activo in uow.activos.prestados_a(usuario_id):
        registrar(
            uow, activo, activo.mover(EstadoActivo.EN_RESGUARDO, custodio_id=custodio_id), motivo, quien
        )
        devueltos += 1
    ajustadas = uow.usuarios.quitar_suplente(usuario_id)
    uow.usuarios.finalizar_vacacion(usuario_id)
    return ResultadoBaja(liberados, devueltos, ajustadas)


class ListUsuariosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Usuario]:
        with self._uow_factory(principal) as uow:
            return uow.usuarios.list_visibles()


class CreateUsuarioUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Usuario:
        require(principal, USUARIOS)
        mensaje = "Código, nombre, cargo y departamento son obligatorios."
        codigo = texto(body.get("codigo"), "codigo", mensaje, maximo=40)
        nombre = texto(body.get("nombre"), "nombre", mensaje, maximo=150)
        if body.get("cargoId") in (None, "") or body.get("departamentoId") in (None, ""):
            raise ValidationError(mensaje)
        cargo_id = parse_id(body.get("cargoId"), "cargoId")
        departamento_id = parse_id(body.get("departamentoId"), "departamentoId")
        mail = correo(body.get("correo"))
        with self._uow_factory(principal) as uow:
            usuario = alta_usuario(uow, codigo, nombre, mail, cargo_id, departamento_id)
            uow.commit()
            return usuario


class UpdateUsuarioUseCase(_Base):
    """Cambiar de cargo no libera equipos: los que el nuevo cargo no permite quedan «fuera de perfil»."""

    def execute(self, principal: Principal, usuario_raw: str, body: dict[str, Any]) -> Usuario:
        require(principal, USUARIOS)
        usuario_id = parse_id(usuario_raw, "usuarioId")
        cambios: dict[str, Any] = {}
        if "codigo" in body:
            cambios["codigo"] = texto(body.get("codigo"), "codigo", "El código es obligatorio.", maximo=40)
        if "nombre" in body:
            cambios["nombre"] = texto(body.get("nombre"), "nombre", "El nombre es obligatorio.", maximo=150)
        if "correo" in body:
            cambios["correo"] = correo(body.get("correo"))
        if "cargoId" in body:
            cambios["cargo_id"] = parse_id(body.get("cargoId"), "cargoId")
        if "departamentoId" in body:
            cambios["departamento_id"] = parse_id(body.get("departamentoId"), "departamentoId")
        with self._uow_factory(principal) as uow:
            usuario = _get(uow, usuario_id)
            _validar_unicos(uow, cambios.get("codigo"), cambios.get("correo"), usuario_id)
            _validar_cargo_depto(uow, cambios.get("cargo_id"), cambios.get("departamento_id"))
            nuevo = replace(usuario, **cambios)
            if nuevo.cargo_id and nuevo.departamento_id:
                nuevo = replace(nuevo, pendiente_clasificar=False)
            usuario = uow.usuarios.save(nuevo)
            uow.commit()
            return usuario


class DeleteUsuarioUseCase(_Base):
    """Baja lógica: conserva el historial."""

    def execute(
        self, principal: Principal, usuario_raw: str, custodio_raw: str | None = None
    ) -> ResultadoBaja:
        require(principal, USUARIOS)
        usuario_id = parse_id(usuario_raw, "usuarioId")
        with self._uow_factory(principal) as uow:
            usuario = _get(uow, usuario_id)
            responsable = custodio(uow, principal, custodio_raw)
            resultado = retirar_de_servicio(
                uow, usuario_id, EstadoActivo.DISPONIBLE, "baja_usuario", operador(principal), responsable
            )
            uow.usuarios.save(replace(usuario, estado=EstadoUsuario.ELIMINADO, vacacion=None))
            uow.commit()
            return resultado


class RegisterVacacionesUseCase(_Base):
    def execute(self, principal: Principal, usuario_raw: str, body: dict[str, Any]) -> Usuario:
        require(principal, USUARIOS)
        usuario_id = parse_id(usuario_raw, "usuarioId")
        if not body.get("desde") or not body.get("hasta") or not body.get("accion"):
            raise ValidationError("Indique fechas y qué pasa con los equipos.")
        desde = fecha(body.get("desde"), "desde", "La fecha «desde» no es válida.")
        hasta = fecha(body.get("hasta"), "hasta", "La fecha «hasta» no es válida.")
        if hasta < desde:
            raise ValidationError(
                "La fecha «hasta» no puede ser anterior a «desde».", details={"field": "hasta"}
            )
        accion = AccionVacacion.parse(body.get("accion"))
        nota = texto(body.get("nota"), "nota", "", requerido=False, maximo=300)
        suplente_id = (
            parse_id_opcional(body.get("suplenteId"), "suplenteId")
            if accion is AccionVacacion.PRESTAMO
            else None
        )
        with self._uow_factory(principal) as uow:
            usuario = _get(uow, usuario_id)
            if usuario.estado is not EstadoUsuario.ACTIVO:
                raise BusinessRuleViolation("Solo se pueden registrar vacaciones a usuarios activos.")
            entregar = [a for a in uow.activos.de_titular(usuario_id) if a.estado is EstadoActivo.ASIGNADO]
            responsable = None
            if accion is AccionVacacion.PRESTAMO:
                self._validar_suplente(uow, usuario_id, suplente_id, entregar)
            elif accion is AccionVacacion.RESGUARDO:
                responsable = custodio(uow, principal, body.get("custodioId"))
            uow.usuarios.create_vacacion(usuario_id, desde, hasta, accion, suplente_id, nota)
            quien = operador(principal)
            for activo in entregar if accion is not AccionVacacion.CONSERVA else []:
                estado = (
                    EstadoActivo.EN_RESGUARDO if accion is AccionVacacion.RESGUARDO else EstadoActivo.PRESTAMO
                )
                nuevo = activo.mover(estado, prestado_a=suplente_id, custodio_id=responsable)
                registrar(uow, activo, nuevo, "vacaciones", quien)
            uow.usuarios.save(replace(usuario, estado=EstadoUsuario.VACACIONES))
            actualizado = _get(uow, usuario_id)
            uow.commit()
            return actualizado

    @staticmethod
    def _validar_suplente(
        uow: AppUnitOfWork, usuario_id: int, suplente_id: int | None, entregar: list
    ) -> None:
        if suplente_id is None:
            raise ValidationError(
                "Seleccione el suplente que recibe los equipos.", details={"field": "suplenteId"}
            )
        if suplente_id == usuario_id:
            raise ValidationError("El suplente debe ser otra persona.", details={"field": "suplenteId"})
        suplente = uow.usuarios.get(suplente_id)
        if suplente is None or suplente.estado is not EstadoUsuario.ACTIVO:
            raise BusinessRuleViolation("El suplente debe estar activo.")
        por_tipo: dict[int, tuple[Articulo, int]] = {}
        for activo in entregar:
            articulo = uow.catalogos.get_articulo(activo.articulo_id)
            _, n = por_tipo.get(articulo.tipo_id, (articulo, 0))
            por_tipo[articulo.tipo_id] = (articulo, n + 1)
        for articulo, n in por_tipo.values():
            validar_limite(uow, suplente.id, suplente.nombre, articulo, nuevos=n)


class FinishVacacionesUseCase(_Base):
    def execute(self, principal: Principal, usuario_raw: str) -> Usuario:
        require(principal, USUARIOS)
        usuario_id = parse_id(usuario_raw, "usuarioId")
        with self._uow_factory(principal) as uow:
            usuario = _get(uow, usuario_id)
            if usuario.estado is not EstadoUsuario.VACACIONES:
                raise BusinessRuleViolation("El usuario no está de vacaciones.")
            quien = operador(principal)
            for activo in uow.activos.de_titular(usuario_id):
                if activo.estado in (EstadoActivo.EN_RESGUARDO, EstadoActivo.PRESTAMO):
                    registrar(uow, activo, activo.mover(EstadoActivo.ASIGNADO), "fin_vacaciones", quien)
            uow.usuarios.finalizar_vacacion(usuario_id)
            uow.usuarios.save(replace(usuario, estado=EstadoUsuario.ACTIVO, vacacion=None))
            actualizado = _get(uow, usuario_id)
            uow.commit()
            return actualizado


class DeactivateUsuarioUseCase(_Base):
    """Desactivación manual (cuentas fuera de Google Workspace): equipos → pendiente de recuperación."""

    def execute(self, principal: Principal, usuario_raw: str, body: dict[str, Any] | None = None) -> Usuario:
        require(principal, USUARIOS)
        usuario_id = parse_id(usuario_raw, "usuarioId")
        with self._uow_factory(principal) as uow:
            usuario = _get(uow, usuario_id)
            if usuario.estado is EstadoUsuario.DESACTIVADO:
                raise BusinessRuleViolation("El usuario ya está desactivado.")
            # los equipos que tenía en préstamo vuelven a TI: alguien los custodia
            responsable = custodio(uow, principal, (body or {}).get("custodioId"))
            retirar_de_servicio(
                uow,
                usuario_id,
                EstadoActivo.PENDIENTE_RECUPERACION,
                "desactivacion",
                operador(principal),
                responsable,
            )
            uow.usuarios.save(
                replace(
                    usuario,
                    estado=EstadoUsuario.DESACTIVADO,
                    fuente_desactivacion="manual",
                    desactivado_en=datetime.now(UTC),
                    vacacion=None,
                )
            )
            actualizado = _get(uow, usuario_id)
            uow.commit()
            return actualizado


class ReactivateUsuarioUseCase(_Base):
    """Vuelve a activo; los equipos siguen pendientes de recuperación hasta que TI decida."""

    def execute(self, principal: Principal, usuario_raw: str) -> Usuario:
        require(principal, USUARIOS)
        usuario_id = parse_id(usuario_raw, "usuarioId")
        with self._uow_factory(principal) as uow:
            usuario = _get(uow, usuario_id)
            if usuario.estado is not EstadoUsuario.DESACTIVADO:
                raise BusinessRuleViolation("El usuario no está desactivado.")
            actualizado = uow.usuarios.save(
                replace(
                    usuario,
                    estado=EstadoUsuario.ACTIVO,
                    fuente_desactivacion=None,
                    desactivado_en=None,
                )
            )
            uow.commit()
            return actualizado
