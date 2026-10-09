"""Módulo activos: alta, asignación según perfil del cargo, liberación, estados e historial."""

from datetime import date

import pytest

from application.use_cases.activos import (
    AssignActivoUseCase,
    ChangeActivoEstadoUseCase,
    CreateActivoUseCase,
    ListMovimientosUseCase,
    ReleaseActivoUseCase,
)
from domain.entities.activos import EstadoActivo
from domain.exceptions import BusinessRuleViolation, ConflictError, ForbiddenError, ValidationError
from fakes.escenario import ADMIN, CONSULTA, escenario

HOY = date(2026, 10, 9)


def _crear(uow, articulo_id, serial, usuario_id=None, estado="disponible"):
    use_case = CreateActivoUseCase(uow.factory, today=lambda: HOY)
    body = {"articuloId": articulo_id, "serial": serial, "estado": estado, "usuarioId": usuario_id}
    return use_case.execute(ADMIN, body)


def test_serial_unico_sin_distinguir_mayusculas():
    uow = escenario()
    _crear(uow, 1, "LT-001")
    with pytest.raises(ConflictError):
        _crear(uow, 1, "lt-001")


def test_alta_asignada_valida_el_perfil_del_cargo():
    uow = escenario()
    activo = _crear(uow, 1, "LT-001", usuario_id=1)
    assert (activo.estado, activo.usuario_id, activo.fecha_asignacion) == (EstadoActivo.ASIGNADO, 1, HOY)
    with pytest.raises(BusinessRuleViolation, match="no permite"):
        _crear(uow, 3, "MN-001", usuario_id=1)  # monitor no permitido para Ejecutivo
    with pytest.raises(BusinessRuleViolation):
        _crear(uow, 1, "LT-002", usuario_id=2)  # Desarrollador solo recibe Precision


def test_asignar_solo_disponibles_y_permitidos():
    uow = escenario()
    precision = _crear(uow, 2, "WS-001")
    asignar = AssignActivoUseCase(uow.factory, today=lambda: HOY)
    asignado = asignar.execute(ADMIN, str(precision.id), {"usuarioId": 2})
    assert asignado.estado is EstadoActivo.ASIGNADO and asignado.usuario_id == 2
    with pytest.raises(BusinessRuleViolation, match="disponibles"):
        asignar.execute(ADMIN, str(precision.id), {"usuarioId": 1})
    with pytest.raises(ForbiddenError):
        asignar.execute(CONSULTA, str(precision.id), {"usuarioId": 1})


def test_liberar_cambiar_estado_y_historial():
    uow = escenario()
    activo = _crear(uow, 1, "LT-001", usuario_id=1)
    liberado = ReleaseActivoUseCase(uow.factory).execute(ADMIN, str(activo.id))
    assert (liberado.estado, liberado.usuario_id, liberado.fecha_asignacion) == (
        EstadoActivo.DISPONIBLE,
        None,
        None,
    )
    with pytest.raises(BusinessRuleViolation):
        ReleaseActivoUseCase(uow.factory).execute(ADMIN, str(activo.id))
    ChangeActivoEstadoUseCase(uow.factory).execute(ADMIN, str(activo.id), {"estado": "en_reparacion"})
    with pytest.raises(ValidationError):
        ChangeActivoEstadoUseCase(uow.factory).execute(ADMIN, str(activo.id), {"estado": "asignado"})
    movs = ListMovimientosUseCase(uow.factory).execute(CONSULTA, str(activo.id))
    assert [m.motivo for m in movs] == ["cambio_estado", "liberacion", "alta"]
    assert movs[1].to_dict()["usuarioAnteriorNombre"] == "Ana"
    assert movs[0].realizado_por == "admin.ti@empresa.com"
