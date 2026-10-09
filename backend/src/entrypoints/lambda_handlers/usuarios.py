"""Handlers HTTP de colaboradores (una Lambda para todo el módulo)."""

from __future__ import annotations

from entrypoints.lambda_handlers import container
from entrypoints.lambda_handlers.http_adapter import HttpRequest, api_handler, created
from entrypoints.lambda_handlers.routing import dispatch

_ID = "/usuarios/{usuarioId}"


def _p(request: HttpRequest):
    return request.require_principal()


def _id(request: HttpRequest) -> str:
    return request.path_param("usuarioId")


ROUTES = {
    ("GET", "/usuarios"): lambda r: container.list_usuarios().execute(_p(r)),
    ("POST", "/usuarios"): lambda r: created(container.create_usuario().execute(_p(r), r.json_body())),
    ("PATCH", _ID): lambda r: container.update_usuario().execute(_p(r), _id(r), r.json_body()),
    ("DELETE", _ID): lambda r: container.delete_usuario().execute(_p(r), _id(r)),
    ("POST", f"{_ID}/vacaciones"): lambda r: container.register_vacaciones().execute(
        _p(r), _id(r), r.json_body()
    ),
    ("POST", f"{_ID}/vacaciones/finalizar"): lambda r: container.finish_vacaciones().execute(_p(r), _id(r)),
    ("POST", f"{_ID}/desactivar"): lambda r: container.deactivate_usuario().execute(_p(r), _id(r)),
    ("POST", f"{_ID}/reactivar"): lambda r: container.reactivate_usuario().execute(_p(r), _id(r)),
}


@api_handler(principal_resolver=container.resolve_principal)
def handler(request: HttpRequest):
    return dispatch(ROUTES, request)
