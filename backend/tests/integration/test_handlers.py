"""Contrato HTTP: eventos de API Gateway (claims de Cognito) → handlers → esquema Aurora generado.

Verifica rutas, códigos y la forma JSON (camelCase) que consume el frontend (shared/api/types.ts).
"""

import json
import os

import pytest

pytestmark = pytest.mark.integration

DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not DATABASE_URL:
    pytest.skip("TEST_DATABASE_URL no definida", allow_module_level=True)

import psycopg  # noqa: E402

from entrypoints.lambda_handlers import (  # noqa: E402
    activos,
    catalogos,
    container,
    importaciones,
    reasignaciones,
    seguridad,
    sesion,
    usuarios,
)
from infrastructure.database.postgresql.app_unit_of_work import AppPostgresUnitOfWork  # noqa: E402
from infrastructure.database.postgresql.connection import (  # noqa: E402
    PostgresConnectionFactory,
    StaticCredentials,
)
from shared.settings import DatabaseSettings  # noqa: E402


@pytest.fixture(autouse=True)
def base_de_prueba(monkeypatch):
    info = psycopg.conninfo.conninfo_to_dict(DATABASE_URL)
    settings = DatabaseSettings(
        "unused", info["dbname"], info.get("host", "localhost"), int(info.get("port", 5432)), "disable", 5, ()
    )
    factory = PostgresConnectionFactory(settings, StaticCredentials(info["user"], info.get("password", "")))
    monkeypatch.setattr(
        container,
        "uow_factory",
        lambda principal=None: AppPostgresUnitOfWork(
            factory, principal, role=None if principal else "service_role"
        ),
    )
    container._current_user.cache_clear()


def _call(handler, method, resource, body=None, path=None, groups="admin_ti"):
    claims = {
        "sub": f"sub-{groups}",
        "email": f"{groups}@empresa.com",
        "email_verified": "true",
        "cognito:groups": groups,
        "name": "Operador TI",
    }
    event = {
        "httpMethod": method,
        "resource": resource,
        "path": resource,
        "pathParameters": path or {},
        "headers": {"Origin": "https://app.example"},
        "body": json.dumps(body) if body is not None else None,
        "requestContext": {"authorizer": {"claims": claims}, "requestId": "r-1"},
    }
    response = handler(event)
    return response["statusCode"], json.loads(response["body"]) if response["body"] else None


def test_contrato_http_de_punta_a_punta():
    status, me = _call(sesion.handler, "GET", "/me")
    assert status == 200 and me["rol"] == "Superadministrador" and me["superadmin"] is True
    assert set(me) == {"correo", "nombre", "rol", "operadorId", "superadmin", "activo", "permisos"}
    assert "reasignaciones.aprobar" in me["permisos"]
    visitante = _call(sesion.handler, "GET", "/me", groups="consulta")[1]
    assert (visitante["rol"], visitante["permisos"], visitante["operadorId"]) == ("Visitante", [], None)
    assert _call(sesion.handler, "GET", "/sync-google/estado") == (
        200,
        {"ultimaExitosa": None, "ultimaCorrida": None},
    )

    status, silo = _call(catalogos.handler, "POST", "/silos", {"nombre": "HTTP-Silo"})
    assert status == 201 and set(silo) == {"id", "nombre", "activo"}
    assert _call(catalogos.handler, "POST", "/silos", {"nombre": "x"}, groups="consulta")[0] == 403
    status, depto = _call(
        catalogos.handler, "POST", "/departamentos", {"nombre": "Ventas", "siloId": silo["id"]}
    )
    assert status == 201 and depto["siloId"] == silo["id"]
    tipos = _call(catalogos.handler, "GET", "/tipos-equipo")[1]
    laptop = next(t for t in tipos if t["nombre"] == "Laptop")
    assert laptop["maxPorUsuario"] == 2
    status, marca = _call(catalogos.handler, "POST", "/marcas", {"nombre": "Dell-HTTP"})
    assert status == 201 and set(marca) == {"id", "nombre", "activo"}
    status, modelo = _call(
        catalogos.handler,
        "POST",
        "/modelos",
        {"marcaId": marca["id"], "tipoId": laptop["id"], "nombre": "HTTP-1"},
    )
    assert status == 201 and set(modelo) == {"id", "marcaId", "tipoId", "nombre", "activo"}
    status, ram = _call(
        catalogos.handler,
        "POST",
        "/caracteristicas",
        {"tipoId": laptop["id"], "nombre": "RAM", "valores": ["16 GB"]},
    )
    assert status == 201 and ram["valores"][0].keys() == {"id", "valor", "activo"}
    status, art = _call(
        catalogos.handler,
        "POST",
        "/articulos",
        {
            "modeloId": modelo["id"],
            "vidaUtilMeses": 48,
            "caracteristicas": [{"caracteristicaId": ram["id"], "valorId": ram["valores"][0]["id"]}],
        },
    )
    assert status == 201 and art["codigo"].startswith("ART-") and art["vidaUtilMeses"] == 48
    assert (
        art["marca"] == "Dell-HTTP" and art["modeloId"] == modelo["id"] and len(art["caracteristicas"]) == 1
    )
    status, tipo = _call(
        catalogos.handler,
        "PATCH",
        "/tipos-equipo/{tipoId}",
        {"maxPorUsuario": 3},
        {"tipoId": str(laptop["id"])},
    )
    assert status == 200 and tipo["maxPorUsuario"] == 3
    for recurso in ("/marcas", "/modelos", "/caracteristicas"):
        assert _call(catalogos.handler, "GET", recurso, groups="consulta")[0] == 200
    status, cargo = _call(catalogos.handler, "POST", "/cargos", {"nombre": "HTTP-Cargo"})
    assert status == 201 and cargo["dotacion"][0].keys() == {"tipoId", "nivel", "articuloRestringidoId"}
    status, cargo = _call(
        catalogos.handler,
        "PUT",
        "/cargos/{cargoId}/dotacion/{tipoId}",
        {"nivel": "obligatorio", "articuloRestringidoId": None},
        {"cargoId": str(cargo["id"]), "tipoId": str(laptop["id"])},
    )
    assert status == 200

    status, u = _call(
        usuarios.handler,
        "POST",
        "/usuarios",
        {
            "codigo": "H-1",
            "nombre": "Ana",
            "correo": "ana@empresa.com",
            "cargoId": cargo["id"],
            "departamentoId": depto["id"],
        },
    )
    assert status == 201 and u["estado"] == "activo" and u["vacacion"] is None
    status, err = _call(
        usuarios.handler,
        "POST",
        "/usuarios",
        {"codigo": "h-1", "nombre": "X", "cargoId": cargo["id"], "departamentoId": depto["id"]},
    )
    assert status == 409 and "código" in err["error"]["message"]

    status, a = _call(
        activos.handler,
        "POST",
        "/activos",
        {"articuloId": art["id"], "serial": "HTTP-SN", "estado": "disponible", "usuarioId": u["id"]},
    )
    assert status == 201 and a["estado"] == "asignado" and len(a["fechaAsignacion"]) == 10
    uid = {"usuarioId": str(u["id"])}
    vac = {
        "desde": "2026-11-01",
        "hasta": "2026-11-10",
        "accion": "resguardo",
        "suplenteId": None,
        "nota": "x",
    }
    status, u2 = _call(usuarios.handler, "POST", "/usuarios/{usuarioId}/vacaciones", vac, uid)
    assert (
        status == 200 and u2["vacacion"]["desde"] == "2026-11-01" and u2["vacacion"]["accion"] == "resguardo"
    )
    assert _call(usuarios.handler, "POST", "/usuarios/{usuarioId}/vacaciones/finalizar", None, uid)[0] == 200
    status, baja = _call(usuarios.handler, "DELETE", "/usuarios/{usuarioId}", None, uid)
    assert status == 200 and baja == {"liberados": 1, "prestamosDevueltosATi": 0, "vacacionesAjustadas": 0}

    aid = {"activoId": str(a["id"])}
    status, movs = _call(activos.handler, "GET", "/activos/{activoId}/movimientos", None, aid)
    assert status == 200 and [m["motivo"] for m in movs] == [
        "baja_usuario",
        "fin_vacaciones",
        "vacaciones",
        "alta",
    ]
    assert movs[0]["usuarioAnteriorNombre"] == "Ana" and movs[0]["realizadoPor"] == "admin_ti@empresa.com"
    assert (
        _call(activos.handler, "POST", "/activos/{activoId}/estado", {"estado": "de_baja"}, aid)[1]["estado"]
        == "de_baja"
    )
    status, err = _call(activos.handler, "POST", "/activos/{activoId}/liberar", None, aid)
    assert status == 422 and err["error"]["message"] == "El equipo no tiene titular."
    assert any(x["serial"] == "HTTP-SN" for x in _call(activos.handler, "GET", "/activos")[1])

    # seguridad: roles y personas con acceso
    status, roles = _call(seguridad.handler, "GET", "/roles")
    assert status == 200 and {"Superadministrador", "Gerente de sistemas", "Visitante"} <= {
        r["nombre"] for r in roles
    }
    assert len(_call(seguridad.handler, "GET", "/permisos")[1]) == 8
    status, rol = _call(seguridad.handler, "POST", "/roles", {"nombre": "Auditor", "permisos": []})
    assert status == 201 and rol["esSistema"] is False
    rid = {"rolId": str(rol["id"])}
    status, rol = _call(seguridad.handler, "PATCH", "/roles/{rolId}", {"permisos": ["activos.asignar"]}, rid)
    assert status == 200 and rol["permisos"] == ["activos.asignar"]
    assert _call(seguridad.handler, "POST", "/roles", {"nombre": "X"}, groups="consulta")[0] == 403
    status, operadores = _call(seguridad.handler, "GET", "/operadores")
    assert status == 200 and operadores[0].keys() == {
        "id",
        "correo",
        "nombre",
        "rolId",
        "rolNombre",
        "activo",
        "creadoEn",
    }
    yo = operadores[0]["id"]
    status, err = _call(
        seguridad.handler, "PATCH", "/operadores/{operadorId}", {"activo": False}, {"operadorId": str(yo)}
    )
    assert status == 422

    # reasignaciones con aprobación
    status, u2 = _call(
        usuarios.handler,
        "POST",
        "/usuarios",
        {"codigo": "H-2", "nombre": "Beto", "cargoId": cargo["id"], "departamentoId": depto["id"]},
    )
    status, u3 = _call(
        usuarios.handler,
        "POST",
        "/usuarios",
        {"codigo": "H-3", "nombre": "Ceci", "cargoId": cargo["id"], "departamentoId": depto["id"]},
    )
    status, b = _call(
        activos.handler,
        "POST",
        "/activos",
        {"articuloId": art["id"], "serial": "HTTP-2", "usuarioId": u2["id"]},
    )
    assert status == 201
    status, sol = _call(
        reasignaciones.handler,
        "POST",
        "/reasignaciones",
        {"activoId": b["id"], "usuarioDestino": u3["id"], "motivo": "Cambio de área"},
    )
    assert status == 201 and sol["estado"] == "pendiente" and sol["solicitadoPorNombre"] == "Operador TI"
    pendientes = _call(reasignaciones.handler, "GET", "/reasignaciones", groups="consulta")[1]
    assert [r["id"] for r in pendientes] == [sol["id"]]
    status, ok = _call(
        reasignaciones.handler,
        "POST",
        "/reasignaciones/{reasignacionId}/aprobar",
        None,
        {"reasignacionId": str(sol["id"])},
    )
    assert status == 200 and ok["estado"] == "aprobada"
    status, err = _call(
        reasignaciones.handler,
        "POST",
        "/reasignaciones/{reasignacionId}/rechazar",
        {"comentario": "x"},
        {"reasignacionId": str(sol["id"])},
    )
    assert status == 422

    # carga masiva (vista previa, sin aplicar)
    filas = [
        {
            "codigo": "M-1",
            "nombre": "Masivo",
            "cargo": "HTTP-Cargo",
            "departamento": "Ventas",
            "silo": "HTTP-Silo",
        }
    ]
    status, previa = _call(importaciones.handler, "POST", "/importaciones/usuarios", {"filas": filas})
    assert status == 200 and previa == {
        "filas": [{"fila": 2, "ok": True, "detalle": "M-1 · Masivo"}],
        "errores": 0,
        "validas": 1,
        "aplicado": False,
    }
    status, _ = _call(importaciones.handler, "POST", "/importaciones/activos", {"filas": [{"tipo": "X"}]})
    assert status == 200
