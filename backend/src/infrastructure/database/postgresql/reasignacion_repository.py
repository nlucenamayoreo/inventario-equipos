"""Adapter PostgreSQL de reasignaciones (tbl_reasignacion)."""

from __future__ import annotations

import psycopg

from application.ports.reasignaciones import ReasignacionRepository
from domain.entities.activos import EstadoReasignacion, Reasignacion

_SELECT_SQL = """
SELECT r.id, r.activo_id, r.usuario_origen, r.usuario_destino, r.motivo, r.estado::text AS estado,
       r.solicitado_por, r.solicitado_en, r.resuelto_por, r.resuelto_en, r.comentario,
       s.nombre AS solicitado_por_nombre, a.nombre AS resuelto_por_nombre
FROM tbl_reasignacion r
JOIN tbl_operador s ON s.id = r.solicitado_por
LEFT JOIN tbl_operador a ON a.id = r.resuelto_por
{where}
"""


def _reasignacion(row: dict) -> Reasignacion:
    return Reasignacion(**{**row, "estado": EstadoReasignacion(row["estado"])})


class PostgresReasignacionRepository(ReasignacionRepository):
    def __init__(self, connection: psycopg.Connection) -> None:
        self._connection = connection

    def _rows(self, sql: str, params: tuple = ()) -> list[dict]:
        with self._connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()

    def list_all(self, estado: EstadoReasignacion | None = None) -> list[Reasignacion]:
        where = "WHERE r.estado = %s::estado_reasignacion" if estado else ""
        orden = " ORDER BY (r.estado = 'pendiente') DESC, r.solicitado_en DESC LIMIT 500"
        rows = self._rows(_SELECT_SQL.format(where=where) + orden, (estado.value,) if estado else ())
        return [_reasignacion(r) for r in rows]

    def get(self, reasignacion_id: int) -> Reasignacion | None:
        rows = self._rows(
            _SELECT_SQL.format(where="WHERE r.id = %s") + " FOR UPDATE OF r", (reasignacion_id,)
        )
        return _reasignacion(rows[0]) if rows else None

    def pendiente_de_activo(self, activo_id: int) -> Reasignacion | None:
        rows = self._rows(
            _SELECT_SQL.format(where="WHERE r.activo_id = %s AND r.estado = 'pendiente'"), (activo_id,)
        )
        return _reasignacion(rows[0]) if rows else None

    def create(
        self, activo_id: int, usuario_origen: int, usuario_destino: int, motivo: str, solicitado_por: int
    ) -> Reasignacion:
        new_id = self._rows(
            "INSERT INTO tbl_reasignacion "
            "(activo_id, usuario_origen, usuario_destino, motivo, solicitado_por) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (activo_id, usuario_origen, usuario_destino, motivo, solicitado_por),
        )[0]["id"]
        return self.get(new_id)

    def resolver(
        self, reasignacion_id: int, estado: EstadoReasignacion, resuelto_por: int, comentario: str | None
    ) -> Reasignacion:
        self._rows(
            "UPDATE tbl_reasignacion SET estado = %s::estado_reasignacion, resuelto_por = %s, "
            "resuelto_en = now(), "
            "comentario = %s WHERE id = %s RETURNING id",
            (estado.value, resuelto_por, comentario, reasignacion_id),
        )
        return self.get(reasignacion_id)
