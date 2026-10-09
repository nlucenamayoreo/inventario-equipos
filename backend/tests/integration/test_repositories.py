"""Repositories contra el esquema Aurora generado (tablas tbl_*, enums, search_path del usuario app)."""

import os
from datetime import date

import pytest

pytestmark = pytest.mark.integration

DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not DATABASE_URL:
    pytest.skip("TEST_DATABASE_URL no definida", allow_module_level=True)

import psycopg  # noqa: E402

from application.dto.principal import Principal  # noqa: E402
from application.use_cases.activos import AssignActivoUseCase, CreateActivoUseCase  # noqa: E402
from application.use_cases.catalogos import (  # noqa: E402
    CreateArticuloUseCase,
    CreateCargoUseCase,
    CreateDepartamentoUseCase,
    CreateSiloUseCase,
    UpdateDotacionUseCase,
)
from application.use_cases.usuarios import (  # noqa: E402
    CreateUsuarioUseCase,
    DeleteUsuarioUseCase,
    FinishVacacionesUseCase,
    ListUsuariosUseCase,
    RegisterVacacionesUseCase,
)
from domain.entities.activos import EstadoActivo  # noqa: E402
from domain.exceptions import BusinessRuleViolation, ConflictError  # noqa: E402
from infrastructure.database.postgresql.app_unit_of_work import AppPostgresUnitOfWork  # noqa: E402
from infrastructure.database.postgresql.connection import (  # noqa: E402
    PostgresConnectionFactory,
    StaticCredentials,
)
from shared.settings import DatabaseSettings  # noqa: E402

ADMIN = Principal(subject="sub-int", email="admin@empresa.com", groups=frozenset({"admin_ti"}))


@pytest.fixture(scope="module")
def uow_factory():
    info = psycopg.conninfo.conninfo_to_dict(DATABASE_URL)
    settings = DatabaseSettings(
        secret_name="unused",
        name=info["dbname"],
        host=info.get("host", "localhost"),
        port=int(info.get("port", 5432)),
        sslmode="disable",
        connect_timeout=5,
        schemas=(),
    )
    factory = PostgresConnectionFactory(settings, StaticCredentials(info["user"], info.get("password", "")))
    return lambda principal=None: AppPostgresUnitOfWork(factory, principal)


def test_flujo_completo_contra_el_esquema_generado(uow_factory):
    silo = CreateSiloUseCase(uow_factory).execute(ADMIN, {"nombre": "Comercial-int"})
    depto = CreateDepartamentoUseCase(uow_factory).execute(ADMIN, {"nombre": "Ventas", "siloId": silo.id})
    with uow_factory(ADMIN) as uow:
        laptop = next(t for t in uow.catalogos.list_tipos() if t.nombre == "Laptop")  # semilla
    art = CreateArticuloUseCase(uow_factory).execute(
        ADMIN, {"tipoId": laptop.id, "marca": "Dell", "modelo": "L-int"}
    )
    assert art.codigo == f"ART-{art.id:03d}"
    cargo = CreateCargoUseCase(uow_factory).execute(ADMIN, {"nombre": "Ejecutivo-int"})
    assert len(cargo.dotacion) >= 6
    cargo = UpdateDotacionUseCase(uow_factory).execute(
        ADMIN, str(cargo.id), str(laptop.id), {"nivel": "obligatorio", "articuloRestringidoId": art.id}
    )
    assert cargo.item(laptop.id).articulo_restringido_id == art.id

    crear_u = CreateUsuarioUseCase(uow_factory)
    ana = crear_u.execute(
        ADMIN, {"codigo": "I-1", "nombre": "Ana", "cargoId": cargo.id, "departamentoId": depto.id}
    )
    beto = crear_u.execute(
        ADMIN, {"codigo": "I-2", "nombre": "Beto", "cargoId": cargo.id, "departamentoId": depto.id}
    )
    with pytest.raises(ConflictError):
        crear_u.execute(
            ADMIN, {"codigo": "i-1", "nombre": "X", "cargoId": cargo.id, "departamentoId": depto.id}
        )

    alta = CreateActivoUseCase(uow_factory, today=lambda: date(2026, 10, 9))
    activo = alta.execute(ADMIN, {"articuloId": art.id, "serial": "INT-1", "usuarioId": ana.id})
    assert activo.estado is EstadoActivo.ASIGNADO
    with pytest.raises(ConflictError):
        alta.execute(ADMIN, {"articuloId": art.id, "serial": "int-1"})
    libre = alta.execute(ADMIN, {"articuloId": art.id, "serial": "INT-2"})
    AssignActivoUseCase(uow_factory).execute(ADMIN, str(libre.id), {"usuarioId": beto.id})
    with pytest.raises(BusinessRuleViolation):
        AssignActivoUseCase(uow_factory).execute(ADMIN, str(libre.id), {"usuarioId": ana.id})

    vac = {"desde": "2026-11-01", "hasta": "2026-11-10", "accion": "prestamo", "suplenteId": beto.id}
    ana = RegisterVacacionesUseCase(uow_factory).execute(ADMIN, str(ana.id), vac)
    assert ana.vacacion.suplente_id == beto.id
    resultado = DeleteUsuarioUseCase(uow_factory).execute(ADMIN, str(beto.id))
    assert resultado.prestamos_devueltos_a_ti == 1 and resultado.vacaciones_ajustadas == 1
    ana = FinishVacacionesUseCase(uow_factory).execute(ADMIN, str(ana.id))
    assert ana.vacacion is None
    assert beto.id not in [u.id for u in ListUsuariosUseCase(uow_factory).execute(ADMIN)]

    with uow_factory(ADMIN) as uow:
        movs = uow.activos.movimientos(activo.id)
        assert [m.motivo for m in movs] == ["fin_vacaciones", "baja_usuario", "vacaciones", "alta"]
        assert movs[-1].usuario_nuevo_nombre == "Ana"
        assert uow.sync.estado() == {"ultimaExitosa": None, "ultimaCorrida": None}
