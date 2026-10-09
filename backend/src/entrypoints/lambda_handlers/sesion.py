"""Handlers HTTP de sesión: operador actual y estado de la sincronización con Google Workspace."""

from __future__ import annotations

from entrypoints.lambda_handlers import container
from entrypoints.lambda_handlers.http_adapter import HttpRequest, api_handler
from entrypoints.lambda_handlers.routing import dispatch

ROUTES = {
    ("GET", "/me"): lambda r: container.get_session().execute(r.require_principal()),
    ("GET", "/sync-google/estado"): lambda r: container.get_sync_google_status().execute(
        r.require_principal()
    ),
}


@api_handler(principal_resolver=container.resolve_principal)
def handler(request: HttpRequest):
    return dispatch(ROUTES, request)
