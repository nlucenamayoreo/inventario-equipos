"""Seguridad: roles configurables y personas con acceso (invitación por Cognito)."""

import pytest

from application.use_cases.seguridad import (
    CreateRolUseCase,
    InviteOperadorUseCase,
    ListOperadoresUseCase,
    UpdateOperadorUseCase,
    UpdateRolUseCase,
)
from domain.exceptions import BusinessRuleViolation, ConflictError, ForbiddenError, ValidationError
from fakes.escenario import ADMIN, GERENTE, escenario
from fakes.fake_app_unit_of_work import FakeDirectorio


def test_crear_y_editar_roles():
    uow = escenario()
    rol = CreateRolUseCase(uow.factory).execute(
        ADMIN, {"nombre": "Visitante", "permisos": [], "descripcion": "Solo lectura"}
    )
    assert rol.permisos == ()
    with pytest.raises(ConflictError):
        CreateRolUseCase(uow.factory).execute(ADMIN, {"nombre": "visitante"})
    with pytest.raises(ValidationError):
        CreateRolUseCase(uow.factory).execute(ADMIN, {"nombre": "X", "permisos": ["inventado"]})
    rol = UpdateRolUseCase(uow.factory).execute(ADMIN, str(rol.id), {"permisos": ["activos.asignar"]})
    assert rol.permisos == ("activos.asignar",) and rol.nombre == "Visitante"
    with pytest.raises(BusinessRuleViolation):
        UpdateRolUseCase(uow.factory).execute(ADMIN, "1", {"permisos": []})  # Superadministrador
    with pytest.raises(ForbiddenError):
        CreateRolUseCase(uow.factory).execute(GERENTE, {"nombre": "Otro"})


def test_invitar_operador():
    uow = escenario()
    directorio = FakeDirectorio()
    invitar = InviteOperadorUseCase(uow.factory, directorio)
    persona = invitar.execute(ADMIN, {"correo": "Nuevo@Empresa.com", "nombre": "Nuevo", "rolId": 2})
    assert persona.correo == "nuevo@empresa.com" and persona.rol_nombre == "Analista Intelix"
    assert directorio.invitados == [("nuevo@empresa.com", "Nuevo")]
    assert len(ListOperadoresUseCase(uow.factory).execute(GERENTE)) == 4
    with pytest.raises(ConflictError):
        invitar.execute(ADMIN, {"correo": "nuevo@empresa.com", "nombre": "Nuevo", "rolId": 2})
    with pytest.raises(ValidationError):
        invitar.execute(ADMIN, {"correo": "malo", "nombre": "X", "rolId": 2})


def test_editar_operador_reglas():
    uow = escenario()
    actualizar = UpdateOperadorUseCase(uow.factory)
    persona = actualizar.execute(ADMIN, "2", {"rolId": 3, "activo": False})
    assert (persona.rol_id, persona.activo) == (3, False)
    with pytest.raises(BusinessRuleViolation, match="propio"):
        actualizar.execute(ADMIN, "1", {"activo": False})
    uow.seguridad.update_rol(3, "Gerente de sistemas", None, True, ["seguridad.gestionar"])
    gestor = GERENTE.__class__(**{**GERENTE.__dict__, "permisos": frozenset({"seguridad.gestionar"})})
    with pytest.raises(BusinessRuleViolation, match="superadministrador"):
        actualizar.execute(gestor, "1", {"nombre": "Otro"})
