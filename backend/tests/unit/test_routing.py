"""Despacho de rutas de las Lambdas agrupadas por módulo."""

import json

from entrypoints.lambda_handlers import activos, catalogos, sesion, usuarios


def _event(method, resource):
    return {"httpMethod": method, "resource": resource, "path": resource, "headers": {}}


def test_rutas_desconocidas_responden_404_sin_tocar_la_base():
    response = catalogos.handler(_event("GET", "/no-existe"))
    assert response["statusCode"] == 404
    assert json.loads(response["body"])["error"]["code"] == "not_found"


def test_cada_modulo_declara_sus_rutas():
    assert ("GET", "/me") in sesion.ROUTES
    assert ("PUT", "/cargos/{cargoId}/dotacion/{tipoId}") in catalogos.ROUTES
    assert ("POST", "/usuarios/{usuarioId}/vacaciones/finalizar") in usuarios.ROUTES
    assert ("GET", "/activos/{activoId}/movimientos") in activos.ROUTES
