"""Composition root: arma casos de uso con sus adapters. Todo perezoso (se crea en el primer uso)."""

from __future__ import annotations

from functools import lru_cache

from application.dto.principal import Principal
from application.use_cases import activos, catalogos, sesion, usuarios
from application.use_cases.resolve_current_user import ResolveCurrentUserUseCase
from entrypoints.lambda_handlers.bootstrap import connection_factory
from infrastructure.database.postgresql.app_unit_of_work import AppPostgresUnitOfWork


def uow_factory(principal: Principal | None = None) -> AppPostgresUnitOfWork:
    return AppPostgresUnitOfWork(connection_factory(), principal, role=None if principal else "service_role")


@lru_cache(maxsize=1)
def _current_user() -> ResolveCurrentUserUseCase:
    return ResolveCurrentUserUseCase(lambda: uow_factory(None))


def resolve_principal(principal: Principal) -> Principal:
    return _current_user().execute(principal)


# sesión
def get_session() -> sesion.GetSessionUseCase:
    return sesion.GetSessionUseCase()


def get_sync_google_status() -> sesion.GetSyncGoogleStatusUseCase:
    return sesion.GetSyncGoogleStatusUseCase(uow_factory)


# catálogos
def list_silos() -> catalogos.ListSilosUseCase:
    return catalogos.ListSilosUseCase(uow_factory)


def create_silo() -> catalogos.CreateSiloUseCase:
    return catalogos.CreateSiloUseCase(uow_factory)


def list_departamentos() -> catalogos.ListDepartamentosUseCase:
    return catalogos.ListDepartamentosUseCase(uow_factory)


def create_departamento() -> catalogos.CreateDepartamentoUseCase:
    return catalogos.CreateDepartamentoUseCase(uow_factory)


def list_tipos_equipo() -> catalogos.ListTiposEquipoUseCase:
    return catalogos.ListTiposEquipoUseCase(uow_factory)


def create_tipo_equipo() -> catalogos.CreateTipoEquipoUseCase:
    return catalogos.CreateTipoEquipoUseCase(uow_factory)


def list_articulos() -> catalogos.ListArticulosUseCase:
    return catalogos.ListArticulosUseCase(uow_factory)


def create_articulo() -> catalogos.CreateArticuloUseCase:
    return catalogos.CreateArticuloUseCase(uow_factory)


def list_cargos() -> catalogos.ListCargosUseCase:
    return catalogos.ListCargosUseCase(uow_factory)


def create_cargo() -> catalogos.CreateCargoUseCase:
    return catalogos.CreateCargoUseCase(uow_factory)


def update_dotacion() -> catalogos.UpdateDotacionUseCase:
    return catalogos.UpdateDotacionUseCase(uow_factory)


# usuarios
def list_usuarios() -> usuarios.ListUsuariosUseCase:
    return usuarios.ListUsuariosUseCase(uow_factory)


def create_usuario() -> usuarios.CreateUsuarioUseCase:
    return usuarios.CreateUsuarioUseCase(uow_factory)


def update_usuario() -> usuarios.UpdateUsuarioUseCase:
    return usuarios.UpdateUsuarioUseCase(uow_factory)


def delete_usuario() -> usuarios.DeleteUsuarioUseCase:
    return usuarios.DeleteUsuarioUseCase(uow_factory)


def register_vacaciones() -> usuarios.RegisterVacacionesUseCase:
    return usuarios.RegisterVacacionesUseCase(uow_factory)


def finish_vacaciones() -> usuarios.FinishVacacionesUseCase:
    return usuarios.FinishVacacionesUseCase(uow_factory)


def deactivate_usuario() -> usuarios.DeactivateUsuarioUseCase:
    return usuarios.DeactivateUsuarioUseCase(uow_factory)


def reactivate_usuario() -> usuarios.ReactivateUsuarioUseCase:
    return usuarios.ReactivateUsuarioUseCase(uow_factory)


# activos
def list_activos() -> activos.ListActivosUseCase:
    return activos.ListActivosUseCase(uow_factory)


def create_activo() -> activos.CreateActivoUseCase:
    return activos.CreateActivoUseCase(uow_factory)


def assign_activo() -> activos.AssignActivoUseCase:
    return activos.AssignActivoUseCase(uow_factory)


def release_activo() -> activos.ReleaseActivoUseCase:
    return activos.ReleaseActivoUseCase(uow_factory)


def change_activo_estado() -> activos.ChangeActivoEstadoUseCase:
    return activos.ChangeActivoEstadoUseCase(uow_factory)


def list_movimientos() -> activos.ListMovimientosUseCase:
    return activos.ListMovimientosUseCase(uow_factory)
