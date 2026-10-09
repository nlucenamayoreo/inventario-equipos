"""UnitOfWork de la aplicación: arma los repositories sobre la conexión de la transacción."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

import psycopg

from infrastructure.database.postgresql.activo_repository import (
    PostgresActivoRepository,
    PostgresSyncGoogleRepository,
)
from infrastructure.database.postgresql.app_user_repository import PostgresAppUserRepository
from infrastructure.database.postgresql.catalogo_repository import PostgresCatalogoRepository
from infrastructure.database.postgresql.errors import translate_db_error
from infrastructure.database.postgresql.reasignacion_repository import PostgresReasignacionRepository
from infrastructure.database.postgresql.seguridad_repository import PostgresSeguridadRepository
from infrastructure.database.postgresql.unit_of_work import PostgresUnitOfWork
from infrastructure.database.postgresql.usuario_repository import PostgresUsuarioRepository


class AppPostgresUnitOfWork(PostgresUnitOfWork):
    def _build_repositories(self, connection: psycopg.Connection) -> None:
        self.catalogos = PostgresCatalogoRepository(connection)
        self.usuarios = PostgresUsuarioRepository(connection)
        self.activos = PostgresActivoRepository(connection)
        self.sync = PostgresSyncGoogleRepository(connection)
        self.seguridad = PostgresSeguridadRepository(connection)
        self.reasignaciones = PostgresReasignacionRepository(connection)
        self.app_users = PostgresAppUserRepository(connection)

    @contextmanager
    def savepoint(self) -> Iterator[None]:
        """Paso que puede fallar sin invalidar la transacción (filas de una carga masiva)."""
        assert self.connection is not None
        try:
            with self.connection.transaction():
                yield
        except psycopg.Error as error:
            translated = translate_db_error(error)
            if translated is None:
                raise
            raise translated from error
