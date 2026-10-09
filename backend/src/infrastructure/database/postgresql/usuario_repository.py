"""Adapter PostgreSQL de colaboradores (tbl_usuario) y vacaciones (tbl_vacacion)."""

from __future__ import annotations

from datetime import date

import psycopg

from application.ports.usuarios import UsuarioRepository
from domain.entities.usuarios import AccionVacacion, EstadoUsuario, Usuario, Vacacion

_SELECT_SQL = """
SELECT u.id, u.codigo, u.nombre, u.correo, u.cargo_id, u.departamento_id, u.estado::text AS estado,
       u.pendiente_clasificar, u.fuente_desactivacion, u.desactivado_en,
       v.id AS v_id, v.desde AS v_desde, v.hasta AS v_hasta, v.accion::text AS v_accion,
       v.suplente_id AS v_suplente_id, v.nota AS v_nota
FROM tbl_usuario u
LEFT JOIN tbl_vacacion v ON v.usuario_id = u.id AND v.finalizada_en IS NULL
WHERE u.estado <> 'eliminado' {extra}
"""

_INSERT_SQL = """
INSERT INTO tbl_usuario (codigo, nombre, correo, cargo_id, departamento_id)
VALUES (%s, %s, %s, %s, %s) RETURNING id
"""

_UPDATE_SQL = """
UPDATE tbl_usuario
SET codigo = %s, nombre = %s, correo = %s, cargo_id = %s, departamento_id = %s, estado = %s::estado_usuario,
    pendiente_clasificar = %s, fuente_desactivacion = %s, desactivado_en = %s, actualizado_en = now()
WHERE id = %s
"""

_INSERT_VACACION_SQL = """
INSERT INTO tbl_vacacion (usuario_id, desde, hasta, accion, suplente_id, nota)
VALUES (%s, %s, %s, %s::accion_vacacion, %s, %s)
"""


def _usuario(row: dict) -> Usuario:
    vacacion = None
    if row["v_id"] is not None:
        vacacion = Vacacion(
            row["v_id"],
            row["id"],
            row["v_desde"],
            row["v_hasta"],
            AccionVacacion(row["v_accion"]),
            row["v_suplente_id"],
            row["v_nota"],
        )
    return Usuario(
        row["id"],
        row["codigo"],
        row["nombre"],
        row["correo"],
        row["cargo_id"],
        row["departamento_id"],
        EstadoUsuario(row["estado"]),
        row["pendiente_clasificar"],
        row["fuente_desactivacion"],
        row["desactivado_en"],
        vacacion,
    )


class PostgresUsuarioRepository(UsuarioRepository):
    def __init__(self, connection: psycopg.Connection) -> None:
        self._connection = connection

    def _execute(self, sql: str, params: tuple = ()) -> psycopg.Cursor:
        cursor = self._connection.cursor()
        cursor.execute(sql, params)
        return cursor

    def list_visibles(self) -> list[Usuario]:
        with self._execute(_SELECT_SQL.format(extra="ORDER BY u.nombre")) as cursor:
            return [_usuario(r) for r in cursor.fetchall()]

    def get(self, usuario_id: int) -> Usuario | None:
        with self._execute(
            _SELECT_SQL.format(extra="AND u.id = %s FOR UPDATE OF u"), (usuario_id,)
        ) as cursor:
            row = cursor.fetchone()
        return _usuario(row) if row else None

    def por_codigo(self, codigo: str) -> Usuario | None:
        with self._execute(_SELECT_SQL.format(extra="AND lower(u.codigo) = lower(%s)"), (codigo,)) as cursor:
            row = cursor.fetchone()
        return _usuario(row) if row else None

    def estado_por_codigo(self, codigo: str, excluir_id: int | None = None) -> EstadoUsuario | None:
        sql = "SELECT estado::text AS estado FROM tbl_usuario WHERE lower(codigo) = lower(%s) AND id <> %s"
        with self._execute(sql, (codigo, excluir_id or 0)) as cursor:
            row = cursor.fetchone()
        return EstadoUsuario(row["estado"]) if row else None

    def correo_en_uso(self, correo: str, excluir_id: int | None = None) -> bool:
        sql = "SELECT EXISTS (SELECT 1 FROM tbl_usuario WHERE lower(correo) = lower(%s) AND id <> %s) AS hay"
        with self._execute(sql, (correo, excluir_id or 0)) as cursor:
            return cursor.fetchone()["hay"]

    def create(
        self, codigo: str, nombre: str, correo: str | None, cargo_id: int, departamento_id: int
    ) -> Usuario:
        with self._execute(_INSERT_SQL, (codigo, nombre, correo, cargo_id, departamento_id)) as cursor:
            usuario_id = cursor.fetchone()["id"]
        return self.get(usuario_id)

    def save(self, usuario: Usuario) -> Usuario:
        params = (
            usuario.codigo,
            usuario.nombre,
            usuario.correo,
            usuario.cargo_id,
            usuario.departamento_id,
            usuario.estado.value,
            usuario.pendiente_clasificar,
            usuario.fuente_desactivacion,
            usuario.desactivado_en,
            usuario.id,
        )
        self._execute(_UPDATE_SQL, params).close()
        return self.get(usuario.id) if usuario.estado is not EstadoUsuario.ELIMINADO else usuario

    def create_vacacion(
        self,
        usuario_id: int,
        desde: date,
        hasta: date,
        accion: AccionVacacion,
        suplente_id: int | None,
        nota: str | None,
    ) -> None:
        self._execute(
            _INSERT_VACACION_SQL, (usuario_id, desde, hasta, accion.value, suplente_id, nota)
        ).close()

    def finalizar_vacacion(self, usuario_id: int) -> None:
        self._execute(
            "UPDATE tbl_vacacion SET finalizada_en = now() WHERE usuario_id = %s AND finalizada_en IS NULL",
            (usuario_id,),
        ).close()

    def quitar_suplente(self, suplente_id: int) -> int:
        with self._execute(
            "UPDATE tbl_vacacion SET accion = 'resguardo', suplente_id = NULL "
            "WHERE suplente_id = %s AND finalizada_en IS NULL",
            (suplente_id,),
        ) as cursor:
            return cursor.rowcount
