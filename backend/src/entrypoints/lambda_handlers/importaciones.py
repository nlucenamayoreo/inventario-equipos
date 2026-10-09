"""Handlers HTTP de cargas masivas desde los machotes de Excel (una Lambda para el módulo)."""

from __future__ import annotations

from entrypoints.lambda_handlers import container
from entrypoints.lambda_handlers.http_adapter import HttpRequest, api_handler
from entrypoints.lambda_handlers.routing import dispatch

ROUTES = {
    ("POST", "/importaciones/usuarios"): lambda r: container.import_usuarios().execute(
        r.require_principal(), r.json_body()
    ),
    ("POST", "/importaciones/activos"): lambda r: container.import_activos().execute(
        r.require_principal(), r.json_body()
    ),
}


@api_handler(principal_resolver=container.resolve_principal)
def handler(request: HttpRequest):
    return dispatch(ROUTES, request)
