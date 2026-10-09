"""Adapter PostgreSQL de activos (tbl_activo), historial (tbl_activo_movimiento) y sincronización."""

from __future__ import annotations

from datetime import date

import psycopg

from application.ports.activos import ActivoRepository, SyncGoogleRepository
from domain.entities.activos import Activo, EstadoActivo, Movimiento

_COLS = (
    "id, articulo_id, serial, estado::text AS estado, usuario_id, prestado_a, fecha_asignacion, custodio_id"
)

_INSERT_SQL = f"""
INSERT INTO tbl_activo (articulo_id, serial, estado, usuario_id, fecha_asignacion, custodio_id)
VALUES (%s, %s, %s::estado_activo, %s, %s, %s)
RETURNING {_COLS}
"""

_UPDATE_SQL = """
UPDATE tbl_activo
SET estado = %s::estado_activo, usuario_id = %s, prestado_a = %s, fecha_asignacion = %s, custodio_id = %s,
    actualizado_en = now()
WHERE id = %s
"""

_INSERT_MOVIMIENTO_SQL = """
INSERT INTO tbl_activo_movimiento
    (activo_id, estado_anterior, estado_nuevo, usuario_anterior, usuario_nuevo, motivo, realizado_por,
     custodio_anterior, custodio_nuevo)
VALUES (%s, %s::estado_activo, %s::estado_activo, %s, %s, %s, %s, %s, %s)
"""

_MOVIMIENTOS_SQL = """
SELECT m.id, m.activo_id, m.estado_anterior::text AS estado_anterior, m.estado_nuevo::text AS estado_nuevo,
       m.usuario_anterior, m.usuario_nuevo, m.motivo, m.realizado_por, m.realizado_en,
       ua.nombre AS usuario_anterior_nombre, un.nombre AS usuario_nuevo_nombre,
       m.custodio_anterior, m.custodio_nuevo,
       ca.nombre AS custodio_anterior_nombre, cn.nombre AS custodio_nuevo_nombre
FROM tbl_activo_movimiento m
LEFT JOIN tbl_usuario ua ON ua.id = m.usuario_anterior
LEFT JOIN tbl_usuario un ON un.id = m.usuario_nuevo
LEFT JOIN tbl_operador ca ON ca.id = m.custodio_anterior
LEFT JOIN tbl_operador cn ON cn.id = m.custodio_nuevo
WHERE m.activo_id = %s
ORDER BY m.realizado_en DESC, m.id DESC
"""

_TENENCIA_SQL = """
SELECT count(*)::int AS n
FROM tbl_activo a JOIN tbl_articulo ar ON ar.id = a.articulo_id
WHERE ((a.usuario_id = %s AND a.estado IN ('asignado', 'en_resguardo', 'prestamo', 'pendiente_recuperacion'))
       OR (a.prestado_a = %s AND a.estado = 'prestamo'))
  AND ar.tipo_id = %s
"""

_SYNC_SQL = """
SELECT
  (SELECT max(finalizado_en) FROM tbl_sync_google_log WHERE exitoso) AS ultima_exitosa,
  (SELECT row_to_json(l) FROM (
      SELECT iniciado_en, finalizado_en, exitoso, leidos, desactivados, reactivados, creados
      FROM tbl_sync_google_log ORDER BY iniciado_en DESC LIMIT 1) l) AS ultima
"""


def _activo(row: dict) -> Activo:
    return Activo(**{**row, "estado": EstadoActivo(row["estado"])})


def _movimiento(row: dict) -> Movimiento:
    anterior = row["estado_anterior"]
    return Movimiento(
        **{
            **row,
            "estado_anterior": EstadoActivo(anterior) if anterior else None,
            "estado_nuevo": EstadoActivo(row["estado_nuevo"]),
        }
    )


class PostgresActivoRepository(ActivoRepository):
    def __init__(self, connection: psycopg.Connection) -> None:
        self._connection = connection

    def _rows(self, sql: str, params: tuple = ()) -> list[dict]:
        with self._connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()

    def list_all(self) -> list[Activo]:
        return [_activo(r) for r in self._rows(f"SELECT {_COLS} FROM tbl_activo ORDER BY id")]

    def get(self, activo_id: int) -> Activo | None:
        rows = self._rows(f"SELECT {_COLS} FROM tbl_activo WHERE id = %s FOR UPDATE", (activo_id,))
        return _activo(rows[0]) if rows else None

    def serial_en_uso(self, serial: str) -> bool:
        rows = self._rows(
            "SELECT EXISTS (SELECT 1 FROM tbl_activo WHERE lower(serial) = lower(%s)) AS hay", (serial,)
        )
        return rows[0]["hay"]

    def create(
        self,
        articulo_id: int,
        serial: str,
        estado: EstadoActivo,
        usuario_id: int | None,
        fecha: date | None,
        custodio_id: int | None,
    ) -> Activo:
        params = (articulo_id, serial, estado.value, usuario_id, fecha, custodio_id)
        return _activo(self._rows(_INSERT_SQL, params)[0])

    def tenencia_por_tipo(self, usuario_id: int, tipo_id: int) -> int:
        return self._rows(_TENENCIA_SQL, (usuario_id, usuario_id, tipo_id))[0]["n"]

    def save(self, activo: Activo) -> None:
        with self._connection.cursor() as cursor:
            cursor.execute(
                _UPDATE_SQL,
                (
                    activo.estado.value,
                    activo.usuario_id,
                    activo.prestado_a,
                    activo.fecha_asignacion,
                    activo.custodio_id,
                    activo.id,
                ),
            )

    def de_titular(self, usuario_id: int) -> list[Activo]:
        rows = self._rows(
            f"SELECT {_COLS} FROM tbl_activo WHERE usuario_id = %s ORDER BY id FOR UPDATE", (usuario_id,)
        )
        return [_activo(r) for r in rows]

    def prestados_a(self, usuario_id: int) -> list[Activo]:
        rows = self._rows(
            f"SELECT {_COLS} FROM tbl_activo WHERE prestado_a = %s AND estado = 'prestamo' "
            "ORDER BY id FOR UPDATE",
            (usuario_id,),
        )
        return [_activo(r) for r in rows]

    def add_movimiento(self, antes: Activo | None, despues: Activo, motivo: str, realizado_por: str) -> None:
        params = (
            despues.id,
            antes.estado.value if antes else None,
            despues.estado.value,
            antes.usuario_id if antes else None,
            despues.usuario_id,
            motivo,
            realizado_por,
            antes.custodio_id if antes else None,
            despues.custodio_id,
        )
        with self._connection.cursor() as cursor:
            cursor.execute(_INSERT_MOVIMIENTO_SQL, params)

    def movimientos(self, activo_id: int) -> list[Movimiento]:
        return [_movimiento(r) for r in self._rows(_MOVIMIENTOS_SQL, (activo_id,))]


class PostgresSyncGoogleRepository(SyncGoogleRepository):
    def __init__(self, connection: psycopg.Connection) -> None:
        self._connection = connection

    def estado(self) -> dict:
        with self._connection.cursor() as cursor:
            cursor.execute(_SYNC_SQL)
            row = cursor.fetchone()
        ultima = row["ultima"]
        corrida = None
        if ultima:
            corrida = {
                "iniciadoEn": ultima["iniciado_en"],
                "finalizadoEn": ultima["finalizado_en"],
                "exitoso": ultima["exitoso"],
                "leidos": ultima["leidos"],
                "desactivados": ultima["desactivados"],
                "reactivados": ultima["reactivados"],
                "creados": ultima["creados"],
            }
        return {"ultimaExitosa": row["ultima_exitosa"], "ultimaCorrida": corrida}
