"""Reglas compartidas por los casos de uso: permisos, parseo, custodia, límites y registro de movimientos."""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from application.dto.principal import Principal
from application.ports.app_unit_of_work import AppUnitOfWork
from domain.entities.activos import Activo
from domain.entities.catalogos import Articulo
from domain.exceptions import BusinessRuleViolation, ForbiddenError, ValidationError

_CORREO_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def require(principal: Principal, permiso: str) -> None:
    """El rol del operador debe incluir el permiso (el superadministrador tiene todos)."""
    if not principal.activo:
        raise ForbiddenError("Su acceso a la aplicación está desactivado.")
    if not principal.puede(permiso):
        raise ForbiddenError("Su rol no permite esta acción.")


def operador(principal: Principal) -> str:
    """Quién realiza la acción (``realizado_por`` del historial)."""
    return (principal.email or principal.subject or "sistema").lower()


def operador_id(principal: Principal) -> int:
    """Operador (persona con acceso) que actúa; necesario para custodiar o solicitar."""
    if principal.operador_id is None:
        raise ForbiddenError(
            "Su cuenta no está registrada como persona con acceso. Contacte al administrador."
        )
    return principal.operador_id


def parse_id(raw: Any, field: str) -> int:
    try:
        value = int(str(raw))
    except (TypeError, ValueError) as error:
        raise ValidationError(f"'{field}' debe ser numérico.", details={"field": field}) from error
    if value <= 0:
        raise ValidationError(f"'{field}' debe ser positivo.", details={"field": field})
    return value


def parse_id_opcional(raw: Any, field: str) -> int | None:
    return None if raw in (None, "") else parse_id(raw, field)


def texto(raw: Any, field: str, mensaje: str, *, requerido: bool = True, maximo: int = 200) -> str | None:
    value = raw.strip() if isinstance(raw, str) else None
    if not value:
        if requerido:
            raise ValidationError(mensaje, details={"field": field})
        return None
    if len(value) > maximo:
        raise ValidationError(f"'{field}' admite como máximo {maximo} caracteres.", details={"field": field})
    return value


def correo(raw: Any) -> str | None:
    value = texto(raw, "correo", "", requerido=False, maximo=254)
    if value is None:
        return None
    if not _CORREO_RE.match(value):
        raise ValidationError("El correo no es válido.", details={"field": "correo"})
    return value.lower()


def fecha(raw: Any, field: str, mensaje: str) -> date:
    try:
        return date.fromisoformat(str(raw))
    except (TypeError, ValueError) as error:
        raise ValidationError(mensaje, details={"field": field}) from error


def custodio(uow: AppUnitOfWork, principal: Principal, raw: Any) -> int:
    """Responsable del resguardo: el indicado o, si no se indica, el operador que actúa."""
    custodio_id = parse_id_opcional(raw, "custodioId") or operador_id(principal)
    persona = uow.seguridad.get_operador(custodio_id)
    if persona is None or not persona.activo:
        raise ValidationError(
            "El responsable del resguardo debe ser una persona activa con acceso a la aplicación.",
            details={"field": "custodioId"},
        )
    return custodio_id


def validar_limite(
    uow: AppUnitOfWork, usuario_id: int, nombre: str, articulo: Articulo, nuevos: int = 1
) -> None:
    """Máximo de equipos del mismo tipo por persona (Laptop = 2: la propia y una de resguardo o préstamo)."""
    tipo = uow.catalogos.get_tipo(articulo.tipo_id)
    if tipo is None:
        return
    actuales = uow.activos.tenencia_por_tipo(usuario_id, tipo.id)
    if actuales + nuevos > tipo.limite:
        raise BusinessRuleViolation(
            f"{nombre} ya tiene {actuales} equipo(s) de tipo {tipo.nombre}; "
            f"el máximo por persona es {tipo.limite}.",
            code="limite_por_tipo",
        )


def registrar(uow: AppUnitOfWork, antes: Activo, despues: Activo, motivo: str, quien: str) -> bool:
    """Guarda el activo y, si cambió su estado, titular o custodio, deja el movimiento en el historial."""
    uow.activos.save(despues)
    clave = lambda a: (a.estado, a.usuario_id, a.custodio_id)  # noqa: E731
    if clave(antes) == clave(despues):
        return False
    uow.activos.add_movimiento(antes, despues, motivo, quien)
    return True
