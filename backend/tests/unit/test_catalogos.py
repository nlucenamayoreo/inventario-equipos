"""Módulo catalogos: silos, departamentos, tipos, artículos y perfiles de dotación."""

import pytest

from application.use_cases.catalogos import (
    CreateArticuloUseCase,
    CreateCaracteristicaUseCase,
    CreateCargoUseCase,
    CreateDepartamentoUseCase,
    CreateMarcaUseCase,
    CreateModeloUseCase,
    CreateSiloUseCase,
    CreateTipoEquipoUseCase,
    ListCargosUseCase,
    ListSilosUseCase,
    UpdateDotacionUseCase,
    UpdateMarcaUseCase,
    UpdateTipoEquipoUseCase,
)
from domain.entities.catalogos import NivelDotacion
from domain.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from fakes.escenario import ADMIN, ANALISTA, CONSULTA, escenario


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


def test_articulo_desde_modelo_con_caracteristicas():
    uow = escenario()
    modelo = CreateModeloUseCase(uow.factory).execute(
        ADMIN, {"marcaId": 1, "tipoId": 1, "nombre": "Latitude 7450"}
    )
    art = CreateArticuloUseCase(uow.factory).execute(
        ADMIN,
        {
            "modeloId": modelo.id,
            "vidaUtilMeses": 60,
            "caracteristicas": [{"caracteristicaId": 1, "valorId": 2}],
        },
    )
    assert art.codigo == "ART-004" and (art.marca, art.modelo, art.tipo_id) == ("Dell", "Latitude 7450", 1)
    assert art.to_dict()["caracteristicas"] == [{"caracteristicaId": 1, "valorId": 2}]
    with pytest.raises(ConflictError):
        CreateArticuloUseCase(uow.factory).execute(ADMIN, {"modeloId": 1})
    monitor = CreateModeloUseCase(uow.factory).execute(ADMIN, {"marcaId": 2, "tipoId": 2, "nombre": "E27"})
    with pytest.raises(ValidationError):  # característica de laptop en un monitor
        CreateArticuloUseCase(uow.factory).execute(
            ADMIN, {"modeloId": monitor.id, "caracteristicas": [{"caracteristicaId": 1, "valorId": 1}]}
        )
    with pytest.raises(ValidationError):
        CreateArticuloUseCase(uow.factory).execute(ADMIN, {"modeloId": modelo.id, "vidaUtilMeses": -1})
    with pytest.raises(ValidationError):
        CreateArticuloUseCase(uow.factory).execute(ADMIN, {"tipoId": 1, "marca": "X", "modelo": "Y"})


def test_marcas_modelos_y_caracteristicas():
    uow = escenario()
    marca = CreateMarcaUseCase(uow.factory).execute(ADMIN, {"nombre": "Lenovo"})
    with pytest.raises(ConflictError):
        CreateMarcaUseCase(uow.factory).execute(ADMIN, {"nombre": "lenovo"})
    assert UpdateMarcaUseCase(uow.factory).execute(ADMIN, str(marca.id), {"activo": False}).activo is False
    with pytest.raises(ConflictError):
        CreateModeloUseCase(uow.factory).execute(
            ADMIN, {"marcaId": 1, "tipoId": 1, "nombre": "latitude 5440"}
        )
    car = CreateCaracteristicaUseCase(uow.factory).execute(
        ADMIN, {"tipoId": 1, "nombre": "Disco", "valores": ["512 GB", "1 TB", "512 gb"]}
    )
    assert [v.valor for v in car.valores] == ["512 GB", "1 TB"]
    with pytest.raises(ForbiddenError):
        CreateMarcaUseCase(uow.factory).execute(ANALISTA, {"nombre": "Asus"})


def test_maximo_por_tipo_configurable():
    uow = escenario()
    tipo = UpdateTipoEquipoUseCase(uow.factory).execute(ADMIN, "2", {"maxPorUsuario": 3})
    assert tipo.to_dict()["maxPorUsuario"] == 3
    with pytest.raises(ValidationError):
        UpdateTipoEquipoUseCase(uow.factory).execute(ADMIN, "2", {"maxPorUsuario": 0})


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
