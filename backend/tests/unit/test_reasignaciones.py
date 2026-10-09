"""Reasignaciones: un equipo pasa de una persona a otra solo con aprobación del gerente de sistemas."""

from datetime import date

import pytest

from application.use_cases.activos import CreateActivoUseCase, ListMovimientosUseCase, ReleaseActivoUseCase
from application.use_cases.reasignaciones import (
    ApproveReasignacionUseCase,
    CancelReasignacionUseCase,
    ListReasignacionesUseCase,
    RejectReasignacionUseCase,
    RequestReasignacionUseCase,
)
from domain.entities.activos import EstadoActivo, EstadoReasignacion
from domain.exceptions import BusinessRuleViolation, ForbiddenError, ValidationError
from fakes.escenario import ADMIN, ANALISTA, CONSULTA, GERENTE, escenario

HOY = date(2026, 10, 9)


def _base():
    uow = escenario()
    activo = CreateActivoUseCase(uow.factory, today=lambda: HOY).execute(
        ADMIN, {"articuloId": 2, "serial": "WS-001", "usuarioId": 2}
    )
    return uow, activo


def _solicitar(uow, activo_id, destino=1, quien=ANALISTA):
    body = {"activoId": activo_id, "usuarioDestino": destino, "motivo": "Cambio de puesto"}
    return RequestReasignacionUseCase(uow.factory).execute(quien, body)


def test_solicitar_y_aprobar_mueve_el_equipo():
    uow, activo = _base()
    solicitud = _solicitar(uow, activo.id)
    assert solicitud.estado is EstadoReasignacion.PENDIENTE and solicitud.usuario_origen == 2
    assert uow.activos.get(activo.id).usuario_id == 2  # aún no se mueve
    with pytest.raises(BusinessRuleViolation, match="pendiente"):
        _solicitar(uow, activo.id)
    with pytest.raises(BusinessRuleViolation, match="pendiente"):
        ReleaseActivoUseCase(uow.factory).execute(ADMIN, str(activo.id))
    with pytest.raises(ForbiddenError):
        ApproveReasignacionUseCase(uow.factory, today=lambda: HOY).execute(ANALISTA, str(solicitud.id))
    aprobada = ApproveReasignacionUseCase(uow.factory, today=lambda: HOY).execute(GERENTE, str(solicitud.id))
    assert aprobada.estado is EstadoReasignacion.APROBADA and aprobada.resuelto_por == 3
    movido = uow.activos.get(activo.id)
    assert (movido.estado, movido.usuario_id, movido.fecha_asignacion) == (EstadoActivo.ASIGNADO, 1, HOY)
    movs = ListMovimientosUseCase(uow.factory).execute(CONSULTA, str(activo.id))
    assert movs[0].motivo == "reasignacion"
    with pytest.raises(BusinessRuleViolation, match="aprobada"):
        RejectReasignacionUseCase(uow.factory).execute(GERENTE, str(solicitud.id), {"comentario": "x"})


def test_validaciones_de_la_solicitud():
    uow, activo = _base()
    with pytest.raises(ValidationError):
        _solicitar(uow, activo.id, destino=2)  # ya es suyo
    with pytest.raises(ForbiddenError):
        _solicitar(uow, activo.id, quien=CONSULTA)
    disponible = CreateActivoUseCase(uow.factory).execute(ADMIN, {"articuloId": 1, "serial": "LT-9"})
    with pytest.raises(BusinessRuleViolation, match="directo"):
        _solicitar(uow, disponible.id)
    otro = CreateActivoUseCase(uow.factory).execute(
        ADMIN, {"articuloId": 1, "serial": "LT-8", "usuarioId": 1}
    )
    with pytest.raises(BusinessRuleViolation, match="no permite"):
        _solicitar(uow, otro.id, destino=2)  # Desarrollador solo recibe Precision


def test_no_aprueba_su_propia_solicitud_salvo_superadmin():
    uow, activo = _base()
    solicitud = _solicitar(uow, activo.id, quien=GERENTE)
    with pytest.raises(ForbiddenError, match="usted mismo"):
        ApproveReasignacionUseCase(uow.factory).execute(GERENTE, str(solicitud.id))
    solicitud_admin = CancelReasignacionUseCase(uow.factory).execute(GERENTE, str(solicitud.id))
    assert solicitud_admin.estado is EstadoReasignacion.CANCELADA
    propia = _solicitar(uow, activo.id, quien=ADMIN)
    assert ApproveReasignacionUseCase(uow.factory).execute(ADMIN, str(propia.id)).estado is (
        EstadoReasignacion.APROBADA
    )


def test_rechazar_exige_comentario_y_listar():
    uow, activo = _base()
    solicitud = _solicitar(uow, activo.id)
    with pytest.raises(ValidationError):
        RejectReasignacionUseCase(uow.factory).execute(GERENTE, str(solicitud.id), {})
    rechazada = RejectReasignacionUseCase(uow.factory).execute(
        GERENTE, str(solicitud.id), {"comentario": "No procede"}
    )
    assert rechazada.estado is EstadoReasignacion.RECHAZADA
    assert uow.activos.get(activo.id).usuario_id == 2
    assert len(ListReasignacionesUseCase(uow.factory).execute(CONSULTA, "rechazada")) == 1
    with pytest.raises(ValidationError):
        ListReasignacionesUseCase(uow.factory).execute(CONSULTA, "otro")
