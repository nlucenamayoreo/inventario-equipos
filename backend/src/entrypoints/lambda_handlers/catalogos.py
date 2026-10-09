"""Handlers HTTP de catálogos (una Lambda para todo el módulo)."""

from __future__ import annotations

from entrypoints.lambda_handlers import container
from entrypoints.lambda_handlers.http_adapter import HttpRequest, api_handler, created
from entrypoints.lambda_handlers.routing import dispatch


def _p(request: HttpRequest):
    return request.require_principal()


ROUTES = {
    ("GET", "/silos"): lambda r: container.list_silos().execute(_p(r)),
    ("POST", "/silos"): lambda r: created(container.create_silo().execute(_p(r), r.json_body())),
    ("GET", "/departamentos"): lambda r: container.list_departamentos().execute(_p(r)),
    ("POST", "/departamentos"): lambda r: created(
        container.create_departamento().execute(_p(r), r.json_body())
    ),
    ("GET", "/tipos-equipo"): lambda r: container.list_tipos_equipo().execute(_p(r)),
    ("POST", "/tipos-equipo"): lambda r: created(
        container.create_tipo_equipo().execute(_p(r), r.json_body())
    ),
    ("PATCH", "/tipos-equipo/{tipoId}"): lambda r: container.update_tipo_equipo().execute(
        _p(r), r.path_param("tipoId"), r.json_body()
    ),
    ("GET", "/marcas"): lambda r: container.list_marcas().execute(_p(r)),
    ("POST", "/marcas"): lambda r: created(container.create_marca().execute(_p(r), r.json_body())),
    ("PATCH", "/marcas/{marcaId}"): lambda r: container.update_marca().execute(
        _p(r), r.path_param("marcaId"), r.json_body()
    ),
    ("GET", "/modelos"): lambda r: container.list_modelos().execute(_p(r)),
    ("POST", "/modelos"): lambda r: created(container.create_modelo().execute(_p(r), r.json_body())),
    ("PATCH", "/modelos/{modeloId}"): lambda r: container.update_modelo().execute(
        _p(r), r.path_param("modeloId"), r.json_body()
    ),
    ("GET", "/caracteristicas"): lambda r: container.list_caracteristicas().execute(_p(r)),
    ("POST", "/caracteristicas"): lambda r: created(
        container.create_caracteristica().execute(_p(r), r.json_body())
    ),
    ("PATCH", "/caracteristicas/{caracteristicaId}"): lambda r: container.update_caracteristica().execute(
        _p(r), r.path_param("caracteristicaId"), r.json_body()
    ),
    ("GET", "/articulos"): lambda r: container.list_articulos().execute(_p(r)),
    ("POST", "/articulos"): lambda r: created(container.create_articulo().execute(_p(r), r.json_body())),
    ("GET", "/cargos"): lambda r: container.list_cargos().execute(_p(r)),
    ("POST", "/cargos"): lambda r: created(container.create_cargo().execute(_p(r), r.json_body())),
    ("PUT", "/cargos/{cargoId}/dotacion/{tipoId}"): lambda r: container.update_dotacion().execute(
        _p(r), r.path_param("cargoId"), r.path_param("tipoId"), r.json_body()
    ),
}


@api_handler(principal_resolver=container.resolve_principal)
def handler(request: HttpRequest):
    return dispatch(ROUTES, request)
