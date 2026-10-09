"""Módulo catalogos: silos, departamentos, tipos, artículos y perfiles de dotación."""

import pytest

from application.use_cases.catalogos import (
    CreateArticuloUseCase,
    CreateCargoUseCase,
    CreateDepartamentoUseCase,
    CreateSiloUseCase,
    CreateTipoEquipoUseCase,
    ListCargosUseCase,
    ListSilosUseCase,
    UpdateDotacionUseCase,
)
from domain.entities.catalogos import NivelDotacion
from domain.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from fakes.escenario import ADMIN, CONSULTA, escenario


def test_consulta_lee_pero_no_modifica():
    uow = escenario()
    assert [s.nombre for s in ListSilosUseCase(uow.factory).execute(CONSULTA)] == ["Comercial"]
    with pytest.raises(ForbiddenError):
        CreateSiloUseCase(uow.factory).execute(CONSULTA, {"nombre": "Operaciones"})


def test_silo_y_departamento_unicos_sin_mayusculas():
    uow = escenario()
    with pytest.raises(ConflictError):
        CreateSiloUseCase(uow.factory).execute(ADMIN, {"nombre": " comercial "})
    with pytest.raises(ConflictError):
        CreateDepartamentoUseCase(uow.factory).execute(ADMIN, {"nombre": "VENTAS", "siloId": 1})
    with pytest.raises(ValidationError):
        CreateDepartamentoUseCase(uow.factory).execute(ADMIN, {"nombre": "Mercadeo", "siloId": 99})
    depto = CreateDepartamentoUseCase(uow.factory).execute(ADMIN, {"nombre": "Mercadeo", "siloId": 1})
    assert depto.to_dict() == {"id": 2, "siloId": 1, "nombre": "Mercadeo", "activo": True}


def test_cargo_nuevo_permitido_y_tipo_nuevo_no_permitido():
    uow = escenario()
    cargo = CreateCargoUseCase(uow.factory).execute(ADMIN, {"nombre": "Pasante"})
    assert {d.nivel for d in cargo.dotacion} == {NivelDotacion.PERMITIDO}
    tipo = CreateTipoEquipoUseCase(uow.factory).execute(ADMIN, {"nombre": "Tablet"})
    for c in ListCargosUseCase(uow.factory).execute(ADMIN):
        assert c.nivel(tipo.id) is NivelDotacion.NO_PERMITIDO
    with pytest.raises(ConflictError):
        CreateTipoEquipoUseCase(uow.factory).execute(ADMIN, {"nombre": "laptop"})


def test_articulo_codigo_y_duplicado():
    uow = escenario()
    art = CreateArticuloUseCase(uow.factory).execute(
        ADMIN, {"tipoId": 2, "marca": "Dell", "modelo": "U2424", "vidaUtilMeses": 60}
    )
    assert art.codigo == "ART-004" and art.to_dict()["vidaUtilMeses"] == 60
    with pytest.raises(ConflictError):
        CreateArticuloUseCase(uow.factory).execute(
            ADMIN, {"tipoId": 1, "marca": "dell", "modelo": "LATITUDE 5440"}
        )
    with pytest.raises(ValidationError):
        CreateArticuloUseCase(uow.factory).execute(
            ADMIN, {"tipoId": 1, "marca": "X", "modelo": "Y", "vidaUtilMeses": -1}
        )


def test_dotacion_valida_articulo_del_mismo_tipo():
    uow = escenario()
    update = UpdateDotacionUseCase(uow.factory)
    cargo = update.execute(ADMIN, "1", "2", {"nivel": "permitido", "articuloRestringidoId": 3})
    assert cargo.item(2).articulo_restringido_id == 3
    with pytest.raises(ValidationError):
        update.execute(ADMIN, "1", "2", {"nivel": "obligatorio", "articuloRestringidoId": 1})
    cargo = update.execute(ADMIN, "1", "2", {"nivel": "no_permitido", "articuloRestringidoId": 3})
    assert cargo.item(2).articulo_restringido_id is None
    with pytest.raises(NotFoundError):
        update.execute(ADMIN, "99", "1", {"nivel": "permitido"})
    with pytest.raises(ValidationError):
        update.execute(ADMIN, "1", "1", {"nivel": "otro"})
