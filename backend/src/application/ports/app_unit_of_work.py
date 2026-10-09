"""Unidad de trabajo de la aplicación: repositories disponibles dentro de una transacción."""

from __future__ import annotations

from collections.abc import Callable
from contextlib import AbstractContextManager
from typing import Protocol, Self

from application.dto.principal import Principal
from application.ports.activos import ActivoRepository, SyncGoogleRepository
from application.ports.app_user_repository import AppUserRepository
from application.ports.catalogos import CatalogoRepository
from application.ports.reasignaciones import ReasignacionRepository
from application.ports.seguridad import SeguridadRepository
from application.ports.usuarios import UsuarioRepository


class AppUnitOfWork(Protocol):
    catalogos: CatalogoRepository
    usuarios: UsuarioRepository
    activos: ActivoRepository
    sync: SyncGoogleRepository
    seguridad: SeguridadRepository
    reasignaciones: ReasignacionRepository
    app_users: AppUserRepository

    def commit(self) -> None: ...

    def after_commit(self, callback: Callable[[], None]) -> None: ...

    def savepoint(self) -> AbstractContextManager[None]:
        """Si el bloque falla, se deshace solo lo hecho dentro de él."""

    def __enter__(self) -> Self: ...

    def __exit__(self, exc_type, exc, tb) -> None: ...


UnitOfWorkFactory = Callable[[Principal | None], AppUnitOfWork]
