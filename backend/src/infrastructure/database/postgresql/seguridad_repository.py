"""Adapter PostgreSQL de seguridad (tbl_permiso, tbl_rol, tbl_rol_permiso, tbl_operador)."""

from __future__ import annotations

import psycopg

from application.ports.seguridad import SeguridadRepository
from domain.entities.seguridad import Operador, Permiso, Rol

_ROLES_SQL = """
SELECT r.id, r.nombre, r.descripcion, r.es_sistema, r.activo,
       coalesce(array_agg(rp.permiso_codigo ORDER BY rp.permiso_codigo)
                FILTER (WHERE rp.permiso_codigo IS NOT NULL), '{{}}') AS permisos
FROM tbl_rol r
LEFT JOIN tbl_rol_permiso rp ON rp.rol_id = r.id
{where}
GROUP BY r.id
ORDER BY r.es_sistema DESC, r.nombre
"""

_OPERADORES_SQL = """
SELECT o.id, o.correo, o.nombre, o.rol_id, o.activo, o.creado_en, r.nombre AS rol_nombre,
       r.es_sistema AS rol_es_sistema,
       coalesce(array_agg(rp.permiso_codigo ORDER BY rp.permiso_codigo)
                FILTER (WHERE rp.permiso_codigo IS NOT NULL AND r.activo), '{{}}') AS permisos
FROM tbl_operador o
JOIN tbl_rol r ON r.id = o.rol_id
LEFT JOIN tbl_rol_permiso rp ON rp.rol_id = r.id
{where}
GROUP BY o.id, r.id
ORDER BY lower(o.nombre)
"""


def _rol(row: dict) -> Rol:
    return Rol(**{**row, "permisos": tuple(row["permisos"])})


def _operador(row: dict) -> Operador:
    return Operador(**{**row, "permisos": tuple(row["permisos"])})


class PostgresSeguridadRepository(SeguridadRepository):
    def __init__(self, connection: psycopg.Connection) -> None:
        self._connection = connection

    def _rows(self, sql: str, params: tuple = ()) -> list[dict]:
        with self._connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall() if cursor.description else []

    def list_permisos(self) -> list[Permiso]:
        rows = self._rows("SELECT codigo, modulo, descripcion FROM tbl_permiso ORDER BY modulo, codigo")
        return [Permiso(**r) for r in rows]

    def list_roles(self) -> list[Rol]:
        return [_rol(r) for r in self._rows(_ROLES_SQL.format(where=""))]

    def get_rol(self, rol_id: int) -> Rol | None:
        rows = self._rows(_ROLES_SQL.format(where="WHERE r.id = %s"), (rol_id,))
        return _rol(rows[0]) if rows else None

    def rol_por_nombre(self, nombre: str) -> Rol | None:
        rows = self._rows(_ROLES_SQL.format(where="WHERE lower(r.nombre) = lower(%s)"), (nombre,))
        return _rol(rows[0]) if rows else None

    def _permisos_de(self, rol_id: int, permisos: list[str]) -> None:
        self._rows("DELETE FROM tbl_rol_permiso WHERE rol_id = %s", (rol_id,))
        for codigo in permisos:
            self._rows(
                "INSERT INTO tbl_rol_permiso (rol_id, permiso_codigo) VALUES (%s, %s)", (rol_id, codigo)
            )

    def create_rol(self, nombre: str, descripcion: str | None, permisos: list[str]) -> Rol:
        rol_id = self._rows(
            "INSERT INTO tbl_rol (nombre, descripcion) VALUES (%s, %s) RETURNING id", (nombre, descripcion)
        )[0]["id"]
        self._permisos_de(rol_id, permisos)
        return self.get_rol(rol_id)

    def update_rol(
        self, rol_id: int, nombre: str, descripcion: str | None, activo: bool, permisos: list[str]
    ) -> Rol:
        self._rows(
            "UPDATE tbl_rol SET nombre = %s, descripcion = %s, activo = %s WHERE id = %s",
            (nombre, descripcion, activo, rol_id),
        )
        self._permisos_de(rol_id, permisos)
        return self.get_rol(rol_id)

    def list_operadores(self) -> list[Operador]:
        return [_operador(r) for r in self._rows(_OPERADORES_SQL.format(where=""))]

    def get_operador(self, operador_id: int) -> Operador | None:
        rows = self._rows(_OPERADORES_SQL.format(where="WHERE o.id = %s"), (operador_id,))
        return _operador(rows[0]) if rows else None

    def operador_por_correo(self, correo: str) -> Operador | None:
        rows = self._rows(_OPERADORES_SQL.format(where="WHERE lower(o.correo) = lower(%s)"), (correo,))
        return _operador(rows[0]) if rows else None

    def create_operador(self, correo: str, nombre: str, rol_id: int, invitado_por: str | None) -> Operador:
        operador_id = self._rows(
            "INSERT INTO tbl_operador (correo, nombre, rol_id, invitado_por) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (correo, nombre, rol_id, invitado_por),
        )[0]["id"]
        return self.get_operador(operador_id)

    def update_operador(self, operador_id: int, nombre: str, rol_id: int, activo: bool) -> Operador:
        self._rows(
            "UPDATE tbl_operador SET nombre = %s, rol_id = %s, activo = %s, actualizado_en = now() "
            "WHERE id = %s",
            (nombre, rol_id, activo, operador_id),
        )
        return self.get_operador(operador_id)
