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
    CreateCaracteristicaUseCase,
    CreateCargoUseCase,
    CreateDepartamentoUseCase,
    CreateMarcaUseCase,
    CreateModeloUseCase,
    CreateSiloUseCase,
    UpdateDotacionUseCase,
    UpdateTipoEquipoUseCase,
)
from application.use_cases.importaciones import ImportActivosUseCase  # noqa: E402
from application.use_cases.reasignaciones import (  # noqa: E402
    ApproveReasignacionUseCase,
    RequestReasignacionUseCase,
)
from application.use_cases.seguridad import ResolveOperadorUseCase  # noqa: E402
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

PRINCIPAL = Principal(subject="sub-int", email="admin@empresa.com", groups=frozenset({"admin_ti"}))


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
    ADMIN = ResolveOperadorUseCase(uow_factory).execute(PRINCIPAL)  # noqa: N806
    assert ADMIN.superadmin and ADMIN.operador_id is not None
    silo = CreateSiloUseCase(uow_factory).execute(ADMIN, {"nombre": "Comercial-int"})
    depto = CreateDepartamentoUseCase(uow_factory).execute(ADMIN, {"nombre": "Ventas", "siloId": silo.id})
    with uow_factory(ADMIN) as uow:
        laptop = next(t for t in uow.catalogos.list_tipos() if t.nombre == "Laptop")  # semilla
    marca = CreateMarcaUseCase(uow_factory).execute(ADMIN, {"nombre": "Dell-int"})
    modelo = CreateModeloUseCase(uow_factory).execute(
        ADMIN, {"marcaId": marca.id, "tipoId": laptop.id, "nombre": "L-int"}
    )
    ram = CreateCaracteristicaUseCase(uow_factory).execute(
        ADMIN, {"tipoId": laptop.id, "nombre": "RAM-int", "valores": ["16 GB", "32 GB"]}
    )
    art = CreateArticuloUseCase(uow_factory).execute(
        ADMIN,
        {
            "modeloId": modelo.id,
            "caracteristicas": [{"caracteristicaId": ram.id, "valorId": ram.valores[1].id}],
        },
    )
    assert art.caracteristicas == ((ram.id, ram.valores[1].id),) and art.marca == "Dell-int"
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
    assert libre.custodio_id == ADMIN.operador_id
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


def test_reasignacion_limite_e_importacion(uow_factory):
    ADMIN = ResolveOperadorUseCase(uow_factory).execute(PRINCIPAL)  # noqa: N806
    silo = CreateSiloUseCase(uow_factory).execute(ADMIN, {"nombre": "Reasig-int"})
    depto = CreateDepartamentoUseCase(uow_factory).execute(ADMIN, {"nombre": "TI", "siloId": silo.id})
    cargo = CreateCargoUseCase(uow_factory).execute(ADMIN, {"nombre": "Reasig-cargo"})
    with uow_factory(ADMIN) as uow:
        laptop = next(t for t in uow.catalogos.list_tipos() if t.nombre == "Laptop")
    UpdateDotacionUseCase(uow_factory).execute(ADMIN, str(cargo.id), str(laptop.id), {"nivel": "permitido"})
    UpdateTipoEquipoUseCase(uow_factory).execute(ADMIN, str(laptop.id), {"maxPorUsuario": 2})
    crear_u = CreateUsuarioUseCase(uow_factory)
    datos = {"cargoId": cargo.id, "departamentoId": depto.id}
    carla = crear_u.execute(ADMIN, {"codigo": "R-1", "nombre": "Carla", **datos})
    dan = crear_u.execute(ADMIN, {"codigo": "R-2", "nombre": "Dan", **datos})

    filas = [
        {
            "tipo": "Laptop",
            "marca": "Lenovo-int",
            "modelo": "T14",
            "caracteristicas": "Disco: 512 GB",
            "serial": f"IMP-{n}",
            "codigo_usuario": "R-1" if n < 3 else None,
        }
        for n in range(1, 4)
    ] + [{"tipo": "Laptop", "marca": "Lenovo-int", "modelo": "T14", "serial": "IMP-1"}]
    previa = ImportActivosUseCase(uow_factory).execute(ADMIN, {"filas": filas, "confirmar": True})
    assert [f["ok"] for f in previa["filas"]] == [True, True, True, False] and not previa["aplicado"]
    resultado = ImportActivosUseCase(uow_factory).execute(ADMIN, {"filas": filas[:3], "confirmar": True})
    assert resultado["aplicado"], resultado
    with uow_factory(ADMIN) as uow:
        assert uow.activos.tenencia_por_tipo(carla.id, laptop.id) == 2
        tercera = next(a for a in uow.activos.list_all() if a.serial == "IMP-3")
        propia = next(a for a in uow.activos.list_all() if a.serial == "IMP-1")
    with pytest.raises(BusinessRuleViolation, match="máximo"):  # Laptop: máximo 2 por persona
        AssignActivoUseCase(uow_factory).execute(ADMIN, str(tercera.id), {"usuarioId": carla.id})

    solicitud = RequestReasignacionUseCase(uow_factory).execute(
        ADMIN, {"activoId": propia.id, "usuarioDestino": dan.id, "motivo": "Rotación"}
    )
    aprobada = ApproveReasignacionUseCase(uow_factory).execute(ADMIN, str(solicitud.id))
    assert aprobada.estado.value == "aprobada" and aprobada.resuelto_por_nombre
    with uow_factory(ADMIN) as uow:
        assert uow.activos.get(propia.id).usuario_id == dan.id
        assert uow.activos.movimientos(propia.id)[0].motivo == "reasignacion"
