"""Sesión del operador (rol y permisos) y estado de la sincronización con Google Workspace."""

from __future__ import annotations

from application.dto.principal import Principal
from application.ports.app_unit_of_work import UnitOfWorkFactory
from application.use_cases.seguridad import vista_sesion


class GetSessionUseCase:
    def __init__(self, uow_factory: UnitOfWorkFactory) -> None:
        self._uow_factory = uow_factory

    def execute(self, principal: Principal) -> dict:
        with self._uow_factory(principal) as uow:
            permisos = uow.seguridad.list_permisos()
        return vista_sesion(principal, permisos)


class GetSyncGoogleStatusUseCase:
    def __init__(self, uow_factory: UnitOfWorkFactory) -> None:
        self._uow_factory = uow_factory

    def execute(self, principal: Principal) -> dict:
        with self._uow_factory(principal) as uow:
            return uow.sync.estado()
