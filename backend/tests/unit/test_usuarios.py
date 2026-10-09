"""Módulo usuarios: alta, edición, vacaciones, desactivación y baja lógica."""

import pytest

from application.use_cases.activos import CreateActivoUseCase
from application.use_cases.usuarios import (
    CreateUsuarioUseCase,
    DeactivateUsuarioUseCase,
    DeleteUsuarioUseCase,
    FinishVacacionesUseCase,
    ListUsuariosUseCase,
    ReactivateUsuarioUseCase,
    RegisterVacacionesUseCase,
    UpdateUsuarioUseCase,
)
from domain.entities.activos import EstadoActivo
from domain.entities.usuarios import AccionVacacion, EstadoUsuario
from domain.exceptions import BusinessRuleViolation, ConflictError, ValidationError
from fakes.escenario import ADMIN, escenario


def _dar(uow, articulo_id, serial, usuario_id):
    body = {"articuloId": articulo_id, "serial": serial, "usuarioId": usuario_id}
    return CreateActivoUseCase(uow.factory).execute(ADMIN, body)


def _vacaciones(uow, usuario_id, accion, suplente=None):
    body = {"desde": "2026-11-01", "hasta": "2026-11-10", "accion": accion, "suplenteId": suplente}
    return RegisterVacacionesUseCase(uow.factory).execute(ADMIN, str(usuario_id), body)


def test_alta_valida_obligatorios_y_unicos():
    uow = escenario()
    crear = CreateUsuarioUseCase(uow.factory)
    with pytest.raises(ValidationError, match="obligatorios"):
        crear.execute(ADMIN, {"codigo": "U-9", "nombre": "Ceci"})
    with pytest.raises(ConflictError, match="código"):
        crear.execute(ADMIN, {"codigo": "u-001", "nombre": "Ceci", "cargoId": 1, "departamentoId": 1})
    with pytest.raises(ConflictError, match="correo"):
        crear.execute(
            ADMIN,
            {
                "codigo": "U-9",
                "nombre": "Ceci",
                "correo": "ANA@empresa.com",
                "cargoId": 1,
                "departamentoId": 1,
            },
        )
    with pytest.raises(ValidationError):
        crear.execute(
            ADMIN,
            {"codigo": "U-9", "nombre": "Ceci", "correo": "no-es-correo", "cargoId": 1, "departamentoId": 1},
        )
    u = crear.execute(
        ADMIN,
        {
            "codigo": "U-9",
            "nombre": " Ceci ",
            "correo": "Ceci@Empresa.com",
            "cargoId": 1,
            "departamentoId": 1,
        },
    )
    assert (u.nombre, u.correo, u.estado) == ("Ceci", "ceci@empresa.com", EstadoUsuario.ACTIVO)


def test_cambio_de_cargo_no_libera_equipos():
    uow = escenario()
    laptop = _dar(uow, 1, "LT-1", 1)
    UpdateUsuarioUseCase(uow.factory).execute(ADMIN, "1", {"cargoId": 2})
    assert uow.activos.get(laptop.id).usuario_id == 1


def test_vacaciones_prestamo_y_fin():
    uow = escenario()
    laptop = _dar(uow, 1, "LT-1", 1)
    with pytest.raises(ValidationError, match="suplente"):
        _vacaciones(uow, 1, "prestamo")
    usuario = _vacaciones(uow, 1, "prestamo", suplente=2)
    assert usuario.estado is EstadoUsuario.VACACIONES
    assert usuario.vacacion.accion is AccionVacacion.PRESTAMO
    activo = uow.activos.get(laptop.id)
    assert (activo.estado, activo.prestado_a) == (EstadoActivo.PRESTAMO, 2)
    with pytest.raises(BusinessRuleViolation):
        _vacaciones(uow, 1, "conserva")
    usuario = FinishVacacionesUseCase(uow.factory).execute(ADMIN, "1")
    activo = uow.activos.get(laptop.id)
    assert usuario.estado is EstadoUsuario.ACTIVO and usuario.vacacion is None
    assert (activo.estado, activo.prestado_a) == (EstadoActivo.ASIGNADO, None)
    assert [m.motivo for m in uow.activos.movimientos(laptop.id)] == ["fin_vacaciones", "vacaciones", "alta"]


def test_vacaciones_fechas_y_resguardo():
    uow = escenario()
    laptop = _dar(uow, 1, "LT-1", 1)
    body = {"desde": "2026-11-10", "hasta": "2026-11-01", "accion": "conserva"}
    with pytest.raises(ValidationError, match="anterior"):
        RegisterVacacionesUseCase(uow.factory).execute(ADMIN, "1", body)
    _vacaciones(uow, 1, "resguardo")
    assert uow.activos.get(laptop.id).estado is EstadoActivo.EN_RESGUARDO


def test_eliminar_libera_devuelve_prestamos_y_ajusta_vacaciones():
    uow = escenario()
    laptop_ana = _dar(uow, 1, "LT-1", 1)
    laptop_beto = _dar(uow, 2, "WS-1", 2)
    _vacaciones(uow, 1, "prestamo", suplente=2)  # Beto (2) recibe la laptop de Ana
    resultado = DeleteUsuarioUseCase(uow.factory).execute(ADMIN, "2")
    assert resultado.to_dict() == {"liberados": 1, "prestamosDevueltosATi": 1, "vacacionesAjustadas": 1}
    assert uow.activos.get(laptop_beto.id).estado is EstadoActivo.DISPONIBLE
    assert uow.activos.get(laptop_ana.id).estado is EstadoActivo.EN_RESGUARDO
    ana = next(u for u in ListUsuariosUseCase(uow.factory).execute(ADMIN) if u.id == 1)
    assert (ana.vacacion.accion, ana.vacacion.suplente_id) == (AccionVacacion.RESGUARDO, None)
    assert [u.id for u in ListUsuariosUseCase(uow.factory).execute(ADMIN)] == [1]


def test_desactivar_y_reactivar():
    uow = escenario()
    laptop = _dar(uow, 1, "LT-1", 1)
    usuario = DeactivateUsuarioUseCase(uow.factory).execute(ADMIN, "1")
    assert (usuario.estado, usuario.fuente_desactivacion) == (EstadoUsuario.DESACTIVADO, "manual")
    activo = uow.activos.get(laptop.id)
    assert (activo.estado, activo.usuario_id) == (EstadoActivo.PENDIENTE_RECUPERACION, 1)
    usuario = ReactivateUsuarioUseCase(uow.factory).execute(ADMIN, "1")
    assert usuario.estado is EstadoUsuario.ACTIVO
    assert uow.activos.get(laptop.id).estado is EstadoActivo.PENDIENTE_RECUPERACION
