"""Despacho por ruta para Lambdas que atienden varios endpoints de un mismo módulo."""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

from domain.exceptions import NotFoundError
from entrypoints.lambda_handlers.http_adapter import HttpRequest

Route = Callable[[HttpRequest], Any]


def dispatch(routes: Mapping[tuple[str, str], Route], request: HttpRequest) -> Any:
    """Busca ``(método, recurso)`` (p. ej. ``("POST", "/activos/{activoId}/asignar")``) y lo ejecuta."""
    route = routes.get((request.method, request.resource))
    if route is None:
        raise NotFoundError("Ruta no encontrada.")
    return route(request)
