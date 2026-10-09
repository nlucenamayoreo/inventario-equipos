"""Reasignaciones: pasar un equipo de una persona a otra requiere la aprobación del gerente de sistemas.

La solicitud valida desde ya que el destino puede recibirlo (cargo y máximo por tipo); al aprobar se vuelve
a validar, porque la situación pudo cambiar mientras estaba pendiente.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date
from typing import Any

from application.dto.principal import Principal
from application.ports.app_unit_of_work import UnitOfWorkFactory
from application.use_cases.activos import get_activo, validar_receptor
from application.use_cases.common import operador, operador_id, parse_id, registrar, require, texto
from domain.entities.activos import ESTADOS_REASIGNABLES, EstadoActivo, EstadoReasignacion, Reasignacion
from domain.entities.seguridad import REASIGNACIONES_APROBAR, REASIGNACIONES_SOLICITAR
from domain.exceptions import BusinessRuleViolation, ForbiddenError, NotFoundError, ValidationError

_MENSAJE_CARGO = "El cargo de {nombre} no permite este equipo."


class _Base:
    def __init__(self, uow_factory: UnitOfWorkFactory, today: Callable[[], date] = date.today) -> None:
        self._uow_factory = uow_factory
        self.hoy = today


class ListReasignacionesUseCase(_Base):
    def execute(self, principal: Principal, estado_raw: str | None = None) -> list[Reasignacion]:
        estado = None
        if estado_raw:
            try:
                estado = EstadoReasignacion(estado_raw)
            except ValueError as error:
                raise ValidationError("Estado no válido.", details={"field": "estado"}) from error
        with self._uow_factory(principal) as uow:
            return uow.reasignaciones.list_all(estado)


class RequestReasignacionUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Reasignacion:
        require(principal, REASIGNACIONES_SOLICITAR)
        solicitante = operador_id(principal)
        mensaje = "Indique el equipo, la persona que lo recibe y el motivo."
        if body.get("activoId") in (None, "") or body.get("usuarioDestino") in (None, ""):
            raise ValidationError(mensaje)
        activo_id = parse_id(body.get("activoId"), "activoId")
        destino_id = parse_id(body.get("usuarioDestino"), "usuarioDestino")
        motivo = texto(body.get("motivo"), "motivo", mensaje, maximo=500)
        with self._uow_factory(principal) as uow:
            activo = get_activo(uow, activo_id)
            if activo.estado not in ESTADOS_REASIGNABLES or activo.usuario_id is None:
                raise BusinessRuleViolation(
                    "Solo se reasignan equipos que tienen titular (asignados, en resguardo "
                    "o pendientes de recuperación). Los disponibles se asignan directo."
                )
            if activo.usuario_id == destino_id:
                raise ValidationError("El equipo ya es de esa persona.", details={"field": "usuarioDestino"})
            if uow.reasignaciones.pendiente_de_activo(activo_id):
                raise BusinessRuleViolation("El equipo ya tiene una reasignación pendiente de aprobación.")
            validar_receptor(uow, destino_id, uow.catalogos.get_articulo(activo.articulo_id), _MENSAJE_CARGO)
            solicitud = uow.reasignaciones.create(
                activo_id, activo.usuario_id, destino_id, motivo, solicitante
            )
            uow.commit()
            return solicitud


def _pendiente(uow, reasignacion_id: int) -> Reasignacion:
    solicitud = uow.reasignaciones.get(reasignacion_id)
    if solicitud is None:
        raise NotFoundError("La solicitud no existe.")
    if solicitud.estado is not EstadoReasignacion.PENDIENTE:
        raise BusinessRuleViolation(f"La solicitud ya fue {solicitud.estado.value}.")
    return solicitud


class ApproveReasignacionUseCase(_Base):
    """Aprueba y ejecuta: el equipo pasa a la nueva persona como asignado (queda en el historial)."""

    def execute(
        self, principal: Principal, reasignacion_raw: str, body: dict[str, Any] | None = None
    ) -> Reasignacion:
        require(principal, REASIGNACIONES_APROBAR)
        aprobador = operador_id(principal)
        reasignacion_id = parse_id(reasignacion_raw, "reasignacionId")
        comentario = texto((body or {}).get("comentario"), "comentario", "", requerido=False, maximo=500)
        with self._uow_factory(principal) as uow:
            solicitud = _pendiente(uow, reasignacion_id)
            if solicitud.solicitado_por == aprobador and not principal.superadmin:
                raise ForbiddenError("No puede aprobar una reasignación que usted mismo solicitó.")
            activo = get_activo(uow, solicitud.activo_id)
            if activo.usuario_id != solicitud.usuario_origen or activo.estado not in ESTADOS_REASIGNABLES:
                raise BusinessRuleViolation(
                    "El equipo cambió desde la solicitud; rechácela y solicite una nueva."
                )
            validar_receptor(
                uow, solicitud.usuario_destino, uow.catalogos.get_articulo(activo.articulo_id), _MENSAJE_CARGO
            )
            nuevo = activo.mover(
                EstadoActivo.ASIGNADO, titular=solicitud.usuario_destino, fecha_asignacion=self.hoy()
            )
            registrar(uow, activo, nuevo, "reasignacion", operador(principal))
            resuelta = uow.reasignaciones.resolver(
                reasignacion_id, EstadoReasignacion.APROBADA, aprobador, comentario
            )
            uow.commit()
            return resuelta


class RejectReasignacionUseCase(_Base):
    def execute(self, principal: Principal, reasignacion_raw: str, body: dict[str, Any]) -> Reasignacion:
        require(principal, REASIGNACIONES_APROBAR)
        aprobador = operador_id(principal)
        reasignacion_id = parse_id(reasignacion_raw, "reasignacionId")
        comentario = texto(body.get("comentario"), "comentario", "Indique el motivo del rechazo.", maximo=500)
        with self._uow_factory(principal) as uow:
            _pendiente(uow, reasignacion_id)
            resuelta = uow.reasignaciones.resolver(
                reasignacion_id, EstadoReasignacion.RECHAZADA, aprobador, comentario
            )
            uow.commit()
            return resuelta


class CancelReasignacionUseCase(_Base):
    """El solicitante (o quien puede aprobar) retira una solicitud pendiente."""

    def execute(self, principal: Principal, reasignacion_raw: str) -> Reasignacion:
        quien = operador_id(principal)
        reasignacion_id = parse_id(reasignacion_raw, "reasignacionId")
        with self._uow_factory(principal) as uow:
            solicitud = _pendiente(uow, reasignacion_id)
            if solicitud.solicitado_por != quien and not principal.puede(REASIGNACIONES_APROBAR):
                raise ForbiddenError("Solo quien la solicitó puede cancelarla.")
            resuelta = uow.reasignaciones.resolver(reasignacion_id, EstadoReasignacion.CANCELADA, quien, None)
            uow.commit()
            return resuelta
