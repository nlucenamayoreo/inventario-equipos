"""Reglas compartidas por los casos de uso: roles, parseo de parámetros y registro de movimientos."""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from application.dto.principal import Principal
from application.ports.app_unit_of_work import AppUnitOfWork
from domain.entities.activos import Activo
from domain.exceptions import ForbiddenError, ValidationError

GRUPO_ADMIN = "admin_ti"
GRUPO_CONSULTA = "consulta"
_CORREO_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def es_admin(principal: Principal) -> bool:
    return principal.has_group(GRUPO_ADMIN)


def require_admin(principal: Principal) -> None:
    """Solo ``admin_ti`` modifica; ``consulta`` (o sin grupo) es de solo lectura."""
    if not es_admin(principal):
        raise ForbiddenError("Su rol es de solo consulta.")


def operador(principal: Principal) -> str:
    """Quién realiza la acción (``realizado_por`` del historial)."""
    return (principal.email or principal.subject or "sistema").lower()


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


def registrar(uow: AppUnitOfWork, antes: Activo, despues: Activo, motivo: str, quien: str) -> bool:
    """Guarda el activo y, si cambió su estado o titular, deja el movimiento en el historial."""
    uow.activos.save(despues)
    if (antes.estado, antes.usuario_id) == (despues.estado, despues.usuario_id):
        return False
    uow.activos.add_movimiento(antes, despues, motivo, quien)
    return True
