"""Handlers HTTP de reasignaciones con aprobación (una Lambda para el módulo)."""

from __future__ import annotations

from entrypoints.lambda_handlers import container
from entrypoints.lambda_handlers.http_adapter import HttpRequest, api_handler, created
from entrypoints.lambda_handlers.routing import dispatch

_ID = "/reasignaciones/{reasignacionId}"


def _p(request: HttpRequest):
    return request.require_principal()


def _id(request: HttpRequest) -> str:
    return request.path_param("reasignacionId")


ROUTES = {
    ("GET", "/reasignaciones"): lambda r: container.list_reasignaciones().execute(
        _p(r), r.query_str("estado")
    ),
    ("POST", "/reasignaciones"): lambda r: created(
        container.request_reasignacion().execute(_p(r), r.json_body())
    ),
    ("POST", f"{_ID}/aprobar"): lambda r: container.approve_reasignacion().execute(_p(r), _id(r), r.json()),
    ("POST", f"{_ID}/rechazar"): lambda r: container.reject_reasignacion().execute(
        _p(r), _id(r), r.json_body()
    ),
    ("POST", f"{_ID}/cancelar"): lambda r: container.cancel_reasignacion().execute(_p(r), _id(r)),
}


@api_handler(principal_resolver=container.resolve_principal)
def handler(request: HttpRequest):
    return dispatch(ROUTES, request)
