"""Adapter PostgreSQL de catálogos (silos, departamentos, tipos, marcas, modelos, características, artículos y
cargos con dotación)."""

from __future__ import annotations

import psycopg

from application.ports.catalogos import CatalogoRepository
from domain.entities.catalogos import (
    Articulo,
    Caracteristica,
    Cargo,
    Departamento,
    DotacionItem,
    Marca,
    Modelo,
    NivelDotacion,
    Silo,
    TipoEquipo,
    ValorCaracteristica,
)

_TIPO_COLS = "id, nombre, activo, max_por_usuario"
_MODELO_COLS = "id, marca_id, tipo_id, nombre, activo"

_CREATE_ARTICULO_SQL = """
WITH n AS (SELECT nextval(pg_get_serial_sequence('tbl_articulo', 'id'))::int AS id)
INSERT INTO tbl_articulo (id, codigo, tipo_id, marca, modelo, especificaciones, vida_util_meses, modelo_id)
SELECT n.id, 'ART-' || lpad(n.id::text, 3, '0'), %s, %s, %s, %s, %s, %s FROM n
RETURNING id
"""

_ARTICULOS_SQL = """
SELECT a.id, a.codigo, a.tipo_id, a.marca, a.modelo, a.especificaciones, a.vida_util_meses, a.activo,
       a.modelo_id,
       coalesce(json_agg(json_build_array(ac.caracteristica_id, ac.valor_id) ORDER BY ac.caracteristica_id)
                FILTER (WHERE ac.articulo_id IS NOT NULL), '[]') AS caracteristicas
FROM tbl_articulo a
LEFT JOIN tbl_articulo_caracteristica ac ON ac.articulo_id = a.id
{where}
GROUP BY a.id
ORDER BY a.codigo
"""

_CARACTERISTICAS_SQL = """
SELECT c.id, c.tipo_id, c.nombre, c.activo,
       coalesce(json_agg(json_build_object('id', v.id, 'valor', v.valor, 'activo', v.activo)
                         ORDER BY lower(v.valor)) FILTER (WHERE v.id IS NOT NULL), '[]') AS valores
FROM tbl_caracteristica c
LEFT JOIN tbl_caracteristica_valor v ON v.caracteristica_id = c.id
{where}
GROUP BY c.id
ORDER BY c.tipo_id, lower(c.nombre)
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


def _articulo(row: dict) -> Articulo:
    pares = tuple((int(c), int(v)) for c, v in row.pop("caracteristicas"))
    return Articulo(**row, caracteristicas=pares)


def _caracteristica(row: dict) -> Caracteristica:
    valores = tuple(ValorCaracteristica(v["id"], v["valor"], v["activo"]) for v in row.pop("valores"))
    return Caracteristica(**row, valores=valores)


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
        return [TipoEquipo(**r) for r in self._all(f"SELECT {_TIPO_COLS} FROM tbl_tipo_equipo ORDER BY id")]

    def tipo_existe(self, tipo_id: int) -> bool:
        return self._exists("SELECT 1 FROM tbl_tipo_equipo WHERE id = %s", (tipo_id,))

    def tipo_nombre_en_uso(self, nombre: str) -> bool:
        return self._exists("SELECT 1 FROM tbl_tipo_equipo WHERE lower(nombre) = lower(%s)", (nombre,))

    def create_tipo(self, nombre: str) -> TipoEquipo:
        row = self._one(f"INSERT INTO tbl_tipo_equipo (nombre) VALUES (%s) RETURNING {_TIPO_COLS}", (nombre,))
        return TipoEquipo(**row)

    def get_tipo(self, tipo_id: int) -> TipoEquipo | None:
        row = self._one(f"SELECT {_TIPO_COLS} FROM tbl_tipo_equipo WHERE id = %s", (tipo_id,))
        return TipoEquipo(**row) if row else None

    def update_tipo(self, tipo_id: int, nombre: str, max_por_usuario: int) -> TipoEquipo:
        row = self._one(
            f"UPDATE tbl_tipo_equipo SET nombre = %s, max_por_usuario = %s WHERE id = %s "
            f"RETURNING {_TIPO_COLS}",
            (nombre, max_por_usuario, tipo_id),
        )
        return TipoEquipo(**row)

    # marcas
    def list_marcas(self) -> list[Marca]:
        return [
            Marca(**r) for r in self._all("SELECT id, nombre, activo FROM tbl_marca ORDER BY lower(nombre)")
        ]

    def get_marca(self, marca_id: int) -> Marca | None:
        row = self._one("SELECT id, nombre, activo FROM tbl_marca WHERE id = %s", (marca_id,))
        return Marca(**row) if row else None

    def marca_por_nombre(self, nombre: str) -> Marca | None:
        row = self._one("SELECT id, nombre, activo FROM tbl_marca WHERE lower(nombre) = lower(%s)", (nombre,))
        return Marca(**row) if row else None

    def create_marca(self, nombre: str) -> Marca:
        return Marca(
            **self._one("INSERT INTO tbl_marca (nombre) VALUES (%s) RETURNING id, nombre, activo", (nombre,))
        )

    def update_marca(self, marca_id: int, nombre: str, activo: bool) -> Marca:
        row = self._one(
            "UPDATE tbl_marca SET nombre = %s, activo = %s WHERE id = %s RETURNING id, nombre, activo",
            (nombre, activo, marca_id),
        )
        return Marca(**row)

    # modelos
    def list_modelos(self) -> list[Modelo]:
        return [
            Modelo(**r) for r in self._all(f"SELECT {_MODELO_COLS} FROM tbl_modelo ORDER BY lower(nombre)")
        ]

    def get_modelo(self, modelo_id: int) -> Modelo | None:
        row = self._one(f"SELECT {_MODELO_COLS} FROM tbl_modelo WHERE id = %s", (modelo_id,))
        return Modelo(**row) if row else None

    def modelo_por_nombre(self, marca_id: int, tipo_id: int, nombre: str) -> Modelo | None:
        row = self._one(
            f"SELECT {_MODELO_COLS} FROM tbl_modelo "
            "WHERE marca_id = %s AND tipo_id = %s AND lower(nombre) = lower(%s)",
            (marca_id, tipo_id, nombre),
        )
        return Modelo(**row) if row else None

    def create_modelo(self, marca_id: int, tipo_id: int, nombre: str) -> Modelo:
        row = self._one(
            "INSERT INTO tbl_modelo (marca_id, tipo_id, nombre) VALUES (%s, %s, %s) "
            f"RETURNING {_MODELO_COLS}",
            (marca_id, tipo_id, nombre),
        )
        return Modelo(**row)

    def update_modelo(self, modelo_id: int, nombre: str, activo: bool) -> Modelo:
        row = self._one(
            f"UPDATE tbl_modelo SET nombre = %s, activo = %s WHERE id = %s RETURNING {_MODELO_COLS}",
            (nombre, activo, modelo_id),
        )
        return Modelo(**row)

    # características por tipo
    def list_caracteristicas(self) -> list[Caracteristica]:
        return [_caracteristica(r) for r in self._all(_CARACTERISTICAS_SQL.format(where=""))]

    def get_caracteristica(self, caracteristica_id: int) -> Caracteristica | None:
        row = self._one(_CARACTERISTICAS_SQL.format(where="WHERE c.id = %s"), (caracteristica_id,))
        return _caracteristica(row) if row else None

    def caracteristica_por_nombre(self, tipo_id: int, nombre: str) -> Caracteristica | None:
        row = self._one(
            _CARACTERISTICAS_SQL.format(where="WHERE c.tipo_id = %s AND lower(c.nombre) = lower(%s)"),
            (tipo_id, nombre),
        )
        return _caracteristica(row) if row else None

    def create_caracteristica(self, tipo_id: int, nombre: str) -> Caracteristica:
        row = self._one(
            "INSERT INTO tbl_caracteristica (tipo_id, nombre) VALUES (%s, %s) RETURNING id", (tipo_id, nombre)
        )
        return self.get_caracteristica(row["id"])

    def update_caracteristica(self, caracteristica_id: int, nombre: str, activo: bool) -> Caracteristica:
        self._one(
            "UPDATE tbl_caracteristica SET nombre = %s, activo = %s WHERE id = %s RETURNING id",
            (nombre, activo, caracteristica_id),
        )
        return self.get_caracteristica(caracteristica_id)

    def add_valor(self, caracteristica_id: int, valor: str) -> Caracteristica:
        with self._connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO tbl_caracteristica_valor (caracteristica_id, valor) "
                "SELECT %s, %s WHERE NOT EXISTS (SELECT 1 FROM tbl_caracteristica_valor "
                "WHERE caracteristica_id = %s AND lower(valor) = lower(%s))",
                (caracteristica_id, valor, caracteristica_id, valor),
            )
        return self.get_caracteristica(caracteristica_id)

    # artículos
    def list_articulos(self) -> list[Articulo]:
        return [_articulo(r) for r in self._all(_ARTICULOS_SQL.format(where=""))]

    def get_articulo(self, articulo_id: int) -> Articulo | None:
        row = self._one(_ARTICULOS_SQL.format(where="WHERE a.id = %s"), (articulo_id,))
        return _articulo(row) if row else None

    def articulo_duplicado(self, tipo_id: int, marca: str, modelo: str) -> bool:
        return self.articulo_por_modelo(tipo_id, marca, modelo) is not None

    def articulo_por_modelo(self, tipo_id: int, marca: str, modelo: str) -> Articulo | None:
        row = self._one(
            _ARTICULOS_SQL.format(
                where="WHERE a.tipo_id = %s AND lower(a.marca) = lower(%s) AND lower(a.modelo) = lower(%s)"
            ),
            (tipo_id, marca, modelo),
        )
        return _articulo(row) if row else None

    def create_articulo(
        self,
        tipo_id: int,
        marca: str,
        modelo: str,
        especificaciones: str | None,
        vida_util_meses: int | None,
        modelo_id: int | None = None,
        caracteristicas: tuple[tuple[int, int], ...] = (),
    ) -> Articulo:
        row = self._one(
            _CREATE_ARTICULO_SQL, (tipo_id, marca, modelo, especificaciones, vida_util_meses, modelo_id)
        )
        with self._connection.cursor() as cursor:
            for caracteristica_id, valor_id in caracteristicas:
                cursor.execute(
                    "INSERT INTO tbl_articulo_caracteristica (articulo_id, caracteristica_id, valor_id) "
                    "VALUES (%s, %s, %s)",
                    (row["id"], caracteristica_id, valor_id),
                )
        return self.get_articulo(row["id"])

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
