"""Port de catálogos (silos, departamentos, tipos, artículos y cargos con dotación)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from domain.entities.catalogos import (
    Articulo,
    Caracteristica,
    Cargo,
    Departamento,
    Marca,
    Modelo,
    NivelDotacion,
    Silo,
    TipoEquipo,
)


class CatalogoRepository(ABC):
    @abstractmethod
    def list_silos(self) -> list[Silo]: ...

    @abstractmethod
    def silo_existe(self, silo_id: int) -> bool: ...

    @abstractmethod
    def silo_nombre_en_uso(self, nombre: str) -> bool:
        """Sin distinguir mayúsculas."""

    @abstractmethod
    def create_silo(self, nombre: str) -> Silo: ...

    @abstractmethod
    def list_departamentos(self) -> list[Departamento]: ...

    @abstractmethod
    def departamento_existe(self, departamento_id: int) -> bool: ...

    @abstractmethod
    def departamento_nombre_en_uso(self, silo_id: int, nombre: str) -> bool: ...

    @abstractmethod
    def create_departamento(self, silo_id: int, nombre: str) -> Departamento: ...

    @abstractmethod
    def list_tipos(self) -> list[TipoEquipo]: ...

    @abstractmethod
    def tipo_existe(self, tipo_id: int) -> bool: ...

    @abstractmethod
    def tipo_nombre_en_uso(self, nombre: str) -> bool: ...

    @abstractmethod
    def create_tipo(self, nombre: str) -> TipoEquipo: ...

    @abstractmethod
    def get_tipo(self, tipo_id: int) -> TipoEquipo | None: ...

    @abstractmethod
    def update_tipo(self, tipo_id: int, nombre: str, max_por_usuario: int) -> TipoEquipo: ...

    # marcas, modelos y características
    @abstractmethod
    def list_marcas(self) -> list[Marca]: ...

    @abstractmethod
    def get_marca(self, marca_id: int) -> Marca | None: ...

    @abstractmethod
    def marca_por_nombre(self, nombre: str) -> Marca | None: ...

    @abstractmethod
    def create_marca(self, nombre: str) -> Marca: ...

    @abstractmethod
    def update_marca(self, marca_id: int, nombre: str, activo: bool) -> Marca: ...

    @abstractmethod
    def list_modelos(self) -> list[Modelo]: ...

    @abstractmethod
    def get_modelo(self, modelo_id: int) -> Modelo | None: ...

    @abstractmethod
    def modelo_por_nombre(self, marca_id: int, tipo_id: int, nombre: str) -> Modelo | None: ...

    @abstractmethod
    def create_modelo(self, marca_id: int, tipo_id: int, nombre: str) -> Modelo: ...

    @abstractmethod
    def update_modelo(self, modelo_id: int, nombre: str, activo: bool) -> Modelo: ...

    @abstractmethod
    def list_caracteristicas(self) -> list[Caracteristica]:
        """Con sus valores."""

    @abstractmethod
    def get_caracteristica(self, caracteristica_id: int) -> Caracteristica | None: ...

    @abstractmethod
    def caracteristica_por_nombre(self, tipo_id: int, nombre: str) -> Caracteristica | None: ...

    @abstractmethod
    def create_caracteristica(self, tipo_id: int, nombre: str) -> Caracteristica: ...

    @abstractmethod
    def update_caracteristica(self, caracteristica_id: int, nombre: str, activo: bool) -> Caracteristica: ...

    @abstractmethod
    def add_valor(self, caracteristica_id: int, valor: str) -> Caracteristica:
        """Agrega el valor (si ya existe sin distinguir mayúsculas, no duplica)."""

    @abstractmethod
    def list_articulos(self) -> list[Articulo]: ...

    @abstractmethod
    def get_articulo(self, articulo_id: int) -> Articulo | None: ...

    @abstractmethod
    def articulo_duplicado(self, tipo_id: int, marca: str, modelo: str) -> bool:
        """Mismo tipo + marca + modelo, sin distinguir mayúsculas."""

    @abstractmethod
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
        """Genera el código ``ART-001``… a partir del id y guarda las características elegidas."""

    @abstractmethod
    def articulo_por_modelo(self, tipo_id: int, marca: str, modelo: str) -> Articulo | None: ...

    @abstractmethod
    def list_cargos(self) -> list[Cargo]: ...

    @abstractmethod
    def get_cargo(self, cargo_id: int) -> Cargo | None: ...

    @abstractmethod
    def cargo_nombre_en_uso(self, nombre: str) -> bool: ...

    @abstractmethod
    def create_cargo(self, nombre: str, nivel_inicial: NivelDotacion) -> Cargo:
        """Crea el cargo con una fila de dotación por cada tipo existente."""

    @abstractmethod
    def upsert_dotacion(
        self, cargo_id: int, tipo_id: int, nivel: NivelDotacion, articulo_restringido_id: int | None
    ) -> None: ...
