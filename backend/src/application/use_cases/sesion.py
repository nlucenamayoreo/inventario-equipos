"""Sesión del operador (rol según grupo de Cognito) y estado de la sincronización con Google."""

from __future__ import annotations

from application.dto.principal import Principal
from application.ports.app_unit_of_work import UnitOfWorkFactory
from application.use_cases.common import GRUPO_ADMIN, GRUPO_CONSULTA, es_admin


class GetSessionUseCase:
    def execute(self, principal: Principal) -> dict:
        nombre = principal.claims.get("name") or " ".join(
            p for p in (principal.claims.get("given_name"), principal.claims.get("family_name")) if p
        )
        return {
            "correo": principal.email or "",
            "nombre": nombre or principal.email or principal.subject,
            "rol": GRUPO_ADMIN if es_admin(principal) else GRUPO_CONSULTA,
        }


class GetSyncGoogleStatusUseCase:
    def __init__(self, uow_factory: UnitOfWorkFactory) -> None:
        self._uow_factory = uow_factory

    def execute(self, principal: Principal) -> dict:
        with self._uow_factory(principal) as uow:
            return uow.sync.estado()
