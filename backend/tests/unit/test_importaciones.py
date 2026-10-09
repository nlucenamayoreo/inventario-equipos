"""Cargas masivas desde los machotes: vista previa, errores por fila y aplicación todo o nada."""

import pytest

from application.use_cases.importaciones import ImportActivosUseCase, ImportUsuariosUseCase
from domain.entities.activos import EstadoActivo
from domain.exceptions import ForbiddenError, ValidationError
from fakes.escenario import ADMIN, ANALISTA, escenario


def _usuario(codigo, nombre, cargo="Ejecutivo", depto="Ventas", correo=None):
    return {"codigo": codigo, "nombre": nombre, "cargo": cargo, "departamento": depto, "correo": correo}


def test_usuarios_vista_previa_y_errores_por_fila():
    uow = escenario()
    filas = [_usuario("U-010", "Carla"), _usuario("U-001", "Repetido"), _usuario("U-011", "Dan", cargo="CEO")]
    resultado = ImportUsuariosUseCase(uow.factory).execute(ADMIN, {"filas": filas, "confirmar": True})
    assert (resultado["validas"], resultado["errores"], resultado["aplicado"]) == (1, 2, False)
    assert [f["fila"] for f in resultado["filas"] if not f["ok"]] == [3, 4]
    assert "CEO" in resultado["filas"][2]["detalle"]
    assert uow.commits == 0


def test_usuarios_confirmados():
    uow = escenario()
    filas = [
        _usuario("U-010", "Carla", correo="carla@empresa.com"),
        _usuario("U-011", "Dan", "Desarrollador"),
    ]
    previa = ImportUsuariosUseCase(uow.factory).execute(ADMIN, {"filas": filas})
    assert previa["errores"] == 0 and previa["aplicado"] is False and uow.commits == 0
    with pytest.raises(ForbiddenError):
        ImportUsuariosUseCase(uow.factory).execute(ANALISTA, {"filas": filas})
    with pytest.raises(ValidationError):
        ImportUsuariosUseCase(uow.factory).execute(ADMIN, {"filas": []})


def test_activos_crea_catalogo_y_asigna():
    uow = escenario()
    filas = [
        {
            "tipo": "Laptop",
            "marca": "Lenovo",
            "modelo": "ThinkPad T14",
            "caracteristicas": "RAM: 16 GB; Disco: 512 GB",
            "serial": "TP-001",
            "codigo_usuario": "U-001",
        },
        {
            "tipo": "laptop",
            "marca": "lenovo",
            "modelo": "thinkpad t14",
            "serial": "TP-002",
            "estado": "En reparación",
        },
    ]
    resultado = ImportActivosUseCase(uow.factory).execute(ADMIN, {"filas": filas, "confirmar": True})
    assert resultado["aplicado"] and resultado["validas"] == 2, resultado
    articulo = uow.catalogos.articulo_por_modelo(1, "Lenovo", "ThinkPad T14")
    assert articulo.modelo_id is not None and len(articulo.caracteristicas) == 2
    a, b = uow.activos.rows[1], uow.activos.rows[2]
    assert (a.estado, a.usuario_id) == (EstadoActivo.ASIGNADO, 1)
    assert (b.estado, b.custodio_id) == (EstadoActivo.EN_REPARACION, 1)


def test_activos_analista_no_crea_catalogo_y_custodio_debe_existir():
    uow = escenario()
    filas = [
        {"tipo": "Laptop", "marca": "Asus", "modelo": "X", "serial": "AS-1"},
        {
            "tipo": "Laptop",
            "marca": "Dell",
            "modelo": "Latitude 5440",
            "serial": "LT-1",
            "correo_custodio": "x@y.com",
        },
        {
            "tipo": "Laptop",
            "marca": "Dell",
            "modelo": "Latitude 5440",
            "serial": "LT-2",
            "correo_custodio": "gerente@empresa.com",
        },
    ]
    resultado = ImportActivosUseCase(uow.factory).execute(ANALISTA, {"filas": filas})
    assert [f["ok"] for f in resultado["filas"]] == [False, False, True]
    assert "no permite crearlo" in resultado["filas"][0]["detalle"]
