"""Handlers HTTP de seguridad: permisos, roles y personas con acceso (una Lambda para el módulo)."""

from __future__ import annotations

from entrypoints.lambda_handlers import container
from entrypoints.lambda_handlers.http_adapter import HttpRequest, api_handler, created
from entrypoints.lambda_handlers.routing import dispatch


def _p(request: HttpRequest):
    return request.require_principal()


ROUTES = {
    ("GET", "/permisos"): lambda r: container.list_permisos().execute(_p(r)),
    ("GET", "/roles"): lambda r: container.list_roles().execute(_p(r)),
    ("POST", "/roles"): lambda r: created(container.create_rol().execute(_p(r), r.json_body())),
    ("PATCH", "/roles/{rolId}"): lambda r: container.update_rol().execute(
        _p(r), r.path_param("rolId"), r.json_body()
    ),
    ("GET", "/operadores"): lambda r: container.list_operadores().execute(_p(r)),
    ("POST", "/operadores"): lambda r: created(container.invite_operador().execute(_p(r), r.json_body())),
    ("PATCH", "/operadores/{operadorId}"): lambda r: container.update_operador().execute(
        _p(r), r.path_param("operadorId"), r.json_body()
    ),
}


@api_handler(principal_resolver=container.resolve_principal)
def handler(request: HttpRequest):
    return dispatch(ROUTES, request)
