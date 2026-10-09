"""Adapter PostgreSQL de catálogos (tbl_silo, tbl_departamento, tbl_tipo_equipo, tbl_articulo, tbl_cargo*)."""

from __future__ import annotations

import psycopg

from application.ports.catalogos import CatalogoRepository
from domain.entities.catalogos import (
    Articulo,
    Cargo,
    Departamento,
    DotacionItem,
    NivelDotacion,
    Silo,
    TipoEquipo,
)

_ARTICULO_COLS = "id, codigo, tipo_id, marca, modelo, especificaciones, vida_util_meses, activo"

_CREATE_ARTICULO_SQL = f"""
WITH n AS (SELECT nextval(pg_get_serial_sequence('tbl_articulo', 'id'))::int AS id)
INSERT INTO tbl_articulo (id, codigo, tipo_id, marca, modelo, especificaciones, vida_util_meses)
SELECT n.id, 'ART-' || lpad(n.id::text, 3, '0'), %s, %s, %s, %s, %s FROM n
RETURNING {_ARTICULO_COLS}
"""

_CARGOS_SQL = """
SELECT c.id, c.nombre, c.activo,
       coalesce(json_agg(json_build_object('tipo_id', d.tipo_id, 'nivel', d.nivel,
                                           'articulo_restringido', d.articulo_restringido)
                         ORDER BY d.tipo_id) FILTER (WHERE d.tipo_id IS NOT NULL), '[]') AS dotacion
FROM tbl_cargo c
LEFT JOIN tbl_cargo_dotacion d ON d.cargo_id = c.id
{where}
GROUP BY c.id
ORDER BY c.nombre
"""

_UPSERT_DOTACION_SQL = """
INSERT INTO tbl_cargo_dotacion (cargo_id, tipo_id, nivel, articulo_restringido)
VALUES (%s, %s, %s::nivel_dotacion, %s)
ON CONFLICT (cargo_id, tipo_id) DO UPDATE
SET nivel = EXCLUDED.nivel, articulo_restringido = EXCLUDED.articulo_restringido
"""


def _cargo(row: dict) -> Cargo:
    items = tuple(
        DotacionItem(int(d["tipo_id"]), NivelDotacion(d["nivel"]), d["articulo_restringido"])
        for d in row["dotacion"]
    )
    return Cargo(row["id"], row["nombre"], row["activo"], items)


class PostgresCatalogoRepository(CatalogoRepository):
    def __init__(self, connection: psycopg.Connection) -> None:
        self._connection = connection

    def _all(self, sql: str, params: tuple = ()) -> list[dict]:
        with self._connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()

    def _one(self, sql: str, params: tuple = ()) -> dict | None:
        with self._connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchone()

    def _exists(self, sql: str, params: tuple) -> bool:
        return self._one(f"SELECT EXISTS ({sql}) AS hay", params)["hay"]

    # silos
    def list_silos(self) -> list[Silo]:
        return [Silo(**r) for r in self._all("SELECT id, nombre, activo FROM tbl_silo ORDER BY nombre")]

    def silo_existe(self, silo_id: int) -> bool:
        return self._exists("SELECT 1 FROM tbl_silo WHERE id = %s", (silo_id,))

    def silo_nombre_en_uso(self, nombre: str) -> bool:
        return self._exists("SELECT 1 FROM tbl_silo WHERE lower(nombre) = lower(%s)", (nombre,))

    def create_silo(self, nombre: str) -> Silo:
        return Silo(
            **self._one("INSERT INTO tbl_silo (nombre) VALUES (%s) RETURNING id, nombre, activo", (nombre,))
        )

    # departamentos
    def list_departamentos(self) -> list[Departamento]:
        rows = self._all("SELECT id, silo_id, nombre, activo FROM tbl_departamento ORDER BY nombre")
        return [Departamento(**r) for r in rows]

    def departamento_existe(self, departamento_id: int) -> bool:
        return self._exists("SELECT 1 FROM tbl_departamento WHERE id = %s", (departamento_id,))

    def departamento_nombre_en_uso(self, silo_id: int, nombre: str) -> bool:
        return self._exists(
            "SELECT 1 FROM tbl_departamento WHERE silo_id = %s AND lower(nombre) = lower(%s)",
            (silo_id, nombre),
        )

    def create_departamento(self, silo_id: int, nombre: str) -> Departamento:
        row = self._one(
            "INSERT INTO tbl_departamento (silo_id, nombre) VALUES (%s, %s) "
            "RETURNING id, silo_id, nombre, activo",
            (silo_id, nombre),
        )
        return Departamento(**row)

    # tipos de equipo (orden de alta = orden de columnas en la matriz)
    def list_tipos(self) -> list[TipoEquipo]:
        return [
            TipoEquipo(**r) for r in self._all("SELECT id, nombre, activo FROM tbl_tipo_equipo ORDER BY id")
        ]

    def tipo_existe(self, tipo_id: int) -> bool:
        return self._exists("SELECT 1 FROM tbl_tipo_equipo WHERE id = %s", (tipo_id,))

    def tipo_nombre_en_uso(self, nombre: str) -> bool:
        return self._exists("SELECT 1 FROM tbl_tipo_equipo WHERE lower(nombre) = lower(%s)", (nombre,))

    def create_tipo(self, nombre: str) -> TipoEquipo:
        row = self._one(
            "INSERT INTO tbl_tipo_equipo (nombre) VALUES (%s) RETURNING id, nombre, activo", (nombre,)
        )
        return TipoEquipo(**row)

    # artículos
    def list_articulos(self) -> list[Articulo]:
        return [
            Articulo(**r) for r in self._all(f"SELECT {_ARTICULO_COLS} FROM tbl_articulo ORDER BY codigo")
        ]

    def get_articulo(self, articulo_id: int) -> Articulo | None:
        row = self._one(f"SELECT {_ARTICULO_COLS} FROM tbl_articulo WHERE id = %s", (articulo_id,))
        return Articulo(**row) if row else None

    def articulo_duplicado(self, tipo_id: int, marca: str, modelo: str) -> bool:
        return self._exists(
            "SELECT 1 FROM tbl_articulo "
            "WHERE tipo_id = %s AND lower(marca) = lower(%s) AND lower(modelo) = lower(%s)",
            (tipo_id, marca, modelo),
        )

    def create_articulo(
        self, tipo_id: int, marca: str, modelo: str, especificaciones: str | None, vida_util_meses: int | None
    ) -> Articulo:
        row = self._one(_CREATE_ARTICULO_SQL, (tipo_id, marca, modelo, especificaciones, vida_util_meses))
        return Articulo(**row)

    # cargos
    def list_cargos(self) -> list[Cargo]:
        return [_cargo(r) for r in self._all(_CARGOS_SQL.format(where=""))]

    def get_cargo(self, cargo_id: int) -> Cargo | None:
        row = self._one(_CARGOS_SQL.format(where="WHERE c.id = %s"), (cargo_id,))
        return _cargo(row) if row else None

    def cargo_nombre_en_uso(self, nombre: str) -> bool:
        return self._exists("SELECT 1 FROM tbl_cargo WHERE lower(nombre) = lower(%s)", (nombre,))

    def create_cargo(self, nombre: str, nivel_inicial: NivelDotacion) -> Cargo:
        cargo_id = self._one("INSERT INTO tbl_cargo (nombre) VALUES (%s) RETURNING id", (nombre,))["id"]
        with self._connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO tbl_cargo_dotacion (cargo_id, tipo_id, nivel) "
                "SELECT %s, id, %s::nivel_dotacion FROM tbl_tipo_equipo",
                (cargo_id, nivel_inicial.value),
            )
        return self.get_cargo(cargo_id)

    def upsert_dotacion(
        self, cargo_id: int, tipo_id: int, nivel: NivelDotacion, articulo_restringido_id: int | None
    ) -> None:
        with self._connection.cursor() as cursor:
            cursor.execute(_UPSERT_DOTACION_SQL, (cargo_id, tipo_id, nivel.value, articulo_restringido_id))
