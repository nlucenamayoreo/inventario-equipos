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
from fakes.escenario import ADMIN, ANALISTA, CONSULTA, escenario

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


def test_custodia_obligatoria_fuera_de_manos_del_titular():
    uow = escenario()
    disponible = _crear(uow, 1, "LT-001")
    assert disponible.custodio_id == 1  # por defecto, quien lo registra
    activo = _crear(uow, 1, "LT-002", usuario_id=1)
    assert activo.custodio_id is None
    with pytest.raises(ValidationError, match="persona activa"):
        ReleaseActivoUseCase(uow.factory).execute(ADMIN, str(activo.id), {"custodioId": 99})
    liberado = ReleaseActivoUseCase(uow.factory).execute(ADMIN, str(activo.id), {"custodioId": 2})
    assert liberado.custodio_id == 2
    baja = ChangeActivoEstadoUseCase(uow.factory).execute(ADMIN, str(activo.id), {"estado": "de_baja"})
    assert baja.custodio_id is None
    movs = ListMovimientosUseCase(uow.factory).execute(CONSULTA, str(activo.id))
    assert (movs[1].custodio_anterior, movs[1].custodio_nuevo) == (None, 2)


def test_maximo_de_equipos_por_tipo():
    uow = escenario()
    _crear(uow, 1, "LT-001", usuario_id=1)
    _crear(uow, 1, "LT-002", usuario_id=1)  # Laptop admite 2 (propia + resguardo o préstamo)
    with pytest.raises(BusinessRuleViolation, match="máximo por persona es 2") as error:
        _crear(uow, 1, "LT-003", usuario_id=1)
    assert error.value.code == "limite_por_tipo"
    tercera = _crear(uow, 1, "LT-004")
    with pytest.raises(BusinessRuleViolation, match="máximo"):
        AssignActivoUseCase(uow.factory).execute(ADMIN, str(tercera.id), {"usuarioId": 1})


def test_analista_registra_y_asigna_pero_visitante_no():
    uow = escenario()
    activo = CreateActivoUseCase(uow.factory, today=lambda: HOY).execute(
        ANALISTA, {"articuloId": 1, "serial": "LT-001"}
    )
    assert activo.custodio_id == 2
    with pytest.raises(ForbiddenError):
        CreateActivoUseCase(uow.factory).execute(CONSULTA, {"articuloId": 1, "serial": "LT-002"})
