"""Handlers HTTP de activos (una Lambda para todo el módulo)."""

from __future__ import annotations

from entrypoints.lambda_handlers import container
from entrypoints.lambda_handlers.http_adapter import HttpRequest, api_handler, created
from entrypoints.lambda_handlers.routing import dispatch

_ID = "/activos/{activoId}"


def _p(request: HttpRequest):
    return request.require_principal()


def _id(request: HttpRequest) -> str:
    return request.path_param("activoId")


ROUTES = {
    ("GET", "/activos"): lambda r: container.list_activos().execute(_p(r)),
    ("POST", "/activos"): lambda r: created(container.create_activo().execute(_p(r), r.json_body())),
    ("POST", f"{_ID}/asignar"): lambda r: container.assign_activo().execute(_p(r), _id(r), r.json_body()),
    ("POST", f"{_ID}/liberar"): lambda r: container.release_activo().execute(_p(r), _id(r), r.json()),
    ("POST", f"{_ID}/estado"): lambda r: container.change_activo_estado().execute(
        _p(r), _id(r), r.json_body()
    ),
    ("GET", f"{_ID}/movimientos"): lambda r: container.list_movimientos().execute(_p(r), _id(r)),
}


@api_handler(principal_resolver=container.resolve_principal)
def handler(request: HttpRequest):
    return dispatch(ROUTES, request)
