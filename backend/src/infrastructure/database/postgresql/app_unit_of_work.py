"""UnitOfWork de la aplicación: arma los repositories sobre la conexión de la transacción."""

from __future__ import annotations

import psycopg

from infrastructure.database.postgresql.activo_repository import (
    PostgresActivoRepository,
    PostgresSyncGoogleRepository,
)
from infrastructure.database.postgresql.app_user_repository import PostgresAppUserRepository
from infrastructure.database.postgresql.catalogo_repository import PostgresCatalogoRepository
from infrastructure.database.postgresql.unit_of_work import PostgresUnitOfWork
from infrastructure.database.postgresql.usuario_repository import PostgresUsuarioRepository


class AppPostgresUnitOfWork(PostgresUnitOfWork):
    def _build_repositories(self, connection: psycopg.Connection) -> None:
        self.catalogos = PostgresCatalogoRepository(connection)
        self.usuarios = PostgresUsuarioRepository(connection)
        self.activos = PostgresActivoRepository(connection)
        self.sync = PostgresSyncGoogleRepository(connection)
        self.app_users = PostgresAppUserRepository(connection)
