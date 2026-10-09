"""Casos de uso de activos: alta, asignación, liberación, cambio de estado e historial."""

from __future__ import annotations

from collections.abc import Callable
from datetime import date
from typing import Any

from application.dto.principal import Principal
from application.ports.app_unit_of_work import AppUnitOfWork, UnitOfWorkFactory
from application.use_cases.common import (
    operador,
    parse_id,
    parse_id_opcional,
    registrar,
    require_admin,
    texto,
)
from domain.entities.activos import Activo, EstadoActivo, Movimiento, parse_estado_sin_titular
from domain.entities.catalogos import Articulo
from domain.entities.usuarios import EstadoUsuario
from domain.exceptions import BusinessRuleViolation, ConflictError, NotFoundError, ValidationError


class _Base:
    def __init__(self, uow_factory: UnitOfWorkFactory, today: Callable[[], date] = date.today) -> None:
        self._uow_factory = uow_factory
        self.hoy = today


def _get(uow: AppUnitOfWork, activo_id: int) -> Activo:
    activo = uow.activos.get(activo_id)
    if activo is None:
        raise NotFoundError("El activo no existe.")
    return activo


def _validar_receptor(uow: AppUnitOfWork, usuario_id: int, articulo: Articulo, mensaje_cargo: str) -> None:
    """Regla clave: no se asigna un equipo que el cargo no permite (tipo o artículo restringido)."""
    usuario = uow.usuarios.get(usuario_id)
    if usuario is None:
        raise NotFoundError("El usuario no existe.")
    if usuario.estado not in (EstadoUsuario.ACTIVO, EstadoUsuario.VACACIONES):
        raise BusinessRuleViolation(f"{usuario.nombre} está desactivado; no puede recibir equipos.")
    cargo = uow.catalogos.get_cargo(usuario.cargo_id) if usuario.cargo_id else None
    if cargo is None or not cargo.permite(articulo):
        raise BusinessRuleViolation(mensaje_cargo.format(nombre=usuario.nombre), code="no_permitido")


class ListActivosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Activo]:
        with self._uow_factory(principal) as uow:
            return uow.activos.list_all()


class CreateActivoUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Activo:
        require_admin(principal)
        mensaje = "Artículo y serial son obligatorios."
        if body.get("articuloId") in (None, ""):
            raise ValidationError(mensaje, details={"field": "articuloId"})
        articulo_id = parse_id(body.get("articuloId"), "articuloId")
        serial = texto(body.get("serial"), "serial", mensaje, maximo=100)
        estado = parse_estado_sin_titular(body.get("estado") or EstadoActivo.DISPONIBLE.value)
        usuario_id = parse_id_opcional(body.get("usuarioId"), "usuarioId")
        with self._uow_factory(principal) as uow:
            articulo = uow.catalogos.get_articulo(articulo_id)
            if articulo is None:
                raise ValidationError("Seleccione un artículo válido.", details={"field": "articuloId"})
            if uow.activos.serial_en_uso(serial):
                raise ConflictError(f"El serial {serial} ya está registrado.", code="serial_duplicado")
            if usuario_id is not None:
                _validar_receptor(
                    uow,
                    usuario_id,
                    articulo,
                    "El cargo de {nombre} no permite este artículo. "
                    "Regístrelo sin asignar o ajuste el perfil del cargo.",
                )
                estado = EstadoActivo.ASIGNADO
            activo = uow.activos.create(
                articulo_id, serial, estado, usuario_id, self.hoy() if usuario_id is not None else None
            )
            uow.activos.add_movimiento(None, activo, "alta", operador(principal))
            uow.commit()
            return activo


class AssignActivoUseCase(_Base):
    def execute(self, principal: Principal, activo_raw: str, body: dict[str, Any]) -> Activo:
        require_admin(principal)
        activo_id = parse_id(activo_raw, "activoId")
        if body.get("usuarioId") in (None, ""):
            raise ValidationError("Indique el usuario.", details={"field": "usuarioId"})
        usuario_id = parse_id(body.get("usuarioId"), "usuarioId")
        with self._uow_factory(principal) as uow:
            activo = _get(uow, activo_id)
            if activo.estado is not EstadoActivo.DISPONIBLE:
                raise BusinessRuleViolation("Solo se pueden asignar equipos disponibles.")
            articulo = uow.catalogos.get_articulo(activo.articulo_id)
            _validar_receptor(uow, usuario_id, articulo, "El cargo no permite este equipo.")
            nuevo = activo.mover(EstadoActivo.ASIGNADO, titular=usuario_id, fecha_asignacion=self.hoy())
            registrar(uow, activo, nuevo, "asignacion", operador(principal))
            uow.commit()
            return nuevo


class ReleaseActivoUseCase(_Base):
    """Liberar (o recibir un pendiente de recuperación): vuelve a disponible sin titular."""

    def execute(self, principal: Principal, activo_raw: str) -> Activo:
        require_admin(principal)
        activo_id = parse_id(activo_raw, "activoId")
        with self._uow_factory(principal) as uow:
            activo = _get(uow, activo_id)
            if activo.usuario_id is None:
                raise BusinessRuleViolation("El equipo no tiene titular.")
            motivo = "recuperacion" if activo.estado is EstadoActivo.PENDIENTE_RECUPERACION else "liberacion"
            nuevo = activo.mover(EstadoActivo.DISPONIBLE)
            registrar(uow, activo, nuevo, motivo, operador(principal))
            uow.commit()
            return nuevo


class ChangeActivoEstadoUseCase(_Base):
    """Disponible / en reparación / de baja, solo para equipos sin titular."""

    def execute(self, principal: Principal, activo_raw: str, body: dict[str, Any]) -> Activo:
        require_admin(principal)
        activo_id = parse_id(activo_raw, "activoId")
        estado = parse_estado_sin_titular(body.get("estado"))
        with self._uow_factory(principal) as uow:
            activo = _get(uow, activo_id)
            if activo.usuario_id is not None:
                raise BusinessRuleViolation("Libere el equipo antes de cambiar su estado.")
            nuevo = activo.mover(estado)
            registrar(uow, activo, nuevo, "cambio_estado", operador(principal))
            uow.commit()
            return nuevo


class ListMovimientosUseCase(_Base):
    def execute(self, principal: Principal, activo_raw: str) -> list[Movimiento]:
        activo_id = parse_id(activo_raw, "activoId")
        with self._uow_factory(principal) as uow:
            _get(uow, activo_id)
            return uow.activos.movimientos(activo_id)
