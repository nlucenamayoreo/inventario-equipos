"""Port de catálogos (silos, departamentos, tipos, artículos y cargos con dotación)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from domain.entities.catalogos import Articulo, Cargo, Departamento, NivelDotacion, Silo, TipoEquipo


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
    def list_articulos(self) -> list[Articulo]: ...

    @abstractmethod
    def get_articulo(self, articulo_id: int) -> Articulo | None: ...

    @abstractmethod
    def articulo_duplicado(self, tipo_id: int, marca: str, modelo: str) -> bool:
        """Mismo tipo + marca + modelo, sin distinguir mayúsculas."""

    @abstractmethod
    def create_articulo(
        self, tipo_id: int, marca: str, modelo: str, especificaciones: str | None, vida_util_meses: int | None
    ) -> Articulo:
        """Genera el código ``ART-001``… a partir del id."""

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
