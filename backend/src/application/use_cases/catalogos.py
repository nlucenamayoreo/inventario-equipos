"""Casos de uso de catálogos."""

from __future__ import annotations

from typing import Any

from application.dto.principal import Principal
from application.ports.app_unit_of_work import UnitOfWorkFactory
from application.use_cases.common import parse_id, parse_id_opcional, require_admin, texto
from domain.entities.catalogos import Articulo, Cargo, Departamento, NivelDotacion, Silo, TipoEquipo
from domain.exceptions import ConflictError, NotFoundError, ValidationError


class _Base:
    def __init__(self, uow_factory: UnitOfWorkFactory) -> None:
        self._uow_factory = uow_factory


class ListSilosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Silo]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_silos()


class CreateSiloUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Silo:
        require_admin(principal)
        nombre = texto(body.get("nombre"), "nombre", "Indique el nombre del silo.", maximo=100)
        with self._uow_factory(principal) as uow:
            if uow.catalogos.silo_nombre_en_uso(nombre):
                raise ConflictError(f"El silo {nombre} ya existe.")
            silo = uow.catalogos.create_silo(nombre)
            uow.commit()
            return silo


class ListDepartamentosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Departamento]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_departamentos()


class CreateDepartamentoUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Departamento:
        require_admin(principal)
        nombre = texto(body.get("nombre"), "nombre", "Indique nombre y silo del departamento.", maximo=100)
        if body.get("siloId") in (None, ""):
            raise ValidationError("Indique nombre y silo del departamento.", details={"field": "siloId"})
        silo_id = parse_id(body.get("siloId"), "siloId")
        with self._uow_factory(principal) as uow:
            if not uow.catalogos.silo_existe(silo_id):
                raise ValidationError("Seleccione un silo válido.", details={"field": "siloId"})
            if uow.catalogos.departamento_nombre_en_uso(silo_id, nombre):
                raise ConflictError(f"El departamento {nombre} ya existe en ese silo.")
            depto = uow.catalogos.create_departamento(silo_id, nombre)
            uow.commit()
            return depto


class ListTiposEquipoUseCase(_Base):
    def execute(self, principal: Principal) -> list[TipoEquipo]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_tipos()


class CreateTipoEquipoUseCase(_Base):
    """Tipo nuevo: sin filas de dotación, queda «no permitido» en todos los cargos."""

    def execute(self, principal: Principal, body: dict[str, Any]) -> TipoEquipo:
        require_admin(principal)
        nombre = texto(body.get("nombre"), "nombre", "Indique el tipo de equipo.", maximo=60)
        with self._uow_factory(principal) as uow:
            if uow.catalogos.tipo_nombre_en_uso(nombre):
                raise ConflictError(f"El tipo {nombre} ya existe.")
            tipo = uow.catalogos.create_tipo(nombre)
            uow.commit()
            return tipo


class ListArticulosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Articulo]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_articulos()


class CreateArticuloUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Articulo:
        require_admin(principal)
        mensaje = "Tipo, marca y modelo son obligatorios."
        if body.get("tipoId") in (None, ""):
            raise ValidationError(mensaje, details={"field": "tipoId"})
        tipo_id = parse_id(body.get("tipoId"), "tipoId")
        marca = texto(body.get("marca"), "marca", mensaje, maximo=80)
        modelo = texto(body.get("modelo"), "modelo", mensaje, maximo=120)
        specs = texto(body.get("especificaciones"), "especificaciones", "", requerido=False, maximo=500)
        vida = body.get("vidaUtilMeses")
        if vida not in (None, "") and (not isinstance(vida, int) or isinstance(vida, bool) or vida < 0):
            raise ValidationError(
                "La vida útil debe ser un número entero de meses.", details={"field": "vidaUtilMeses"}
            )
        with self._uow_factory(principal) as uow:
            if not uow.catalogos.tipo_existe(tipo_id):
                raise ValidationError("Seleccione un tipo válido.", details={"field": "tipoId"})
            if uow.catalogos.articulo_duplicado(tipo_id, marca, modelo):
                raise ConflictError("Ese artículo ya existe en el catálogo.", code="articulo_duplicado")
            articulo = uow.catalogos.create_articulo(
                tipo_id, marca, modelo, specs, vida if vida != "" else None
            )
            uow.commit()
            return articulo


class ListCargosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Cargo]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_cargos()


class CreateCargoUseCase(_Base):
    """Cargo nuevo: todos los tipos nacen «permitido» (se muestran como Opcional)."""

    def execute(self, principal: Principal, body: dict[str, Any]) -> Cargo:
        require_admin(principal)
        nombre = texto(body.get("nombre"), "nombre", "Indique el nombre del cargo.", maximo=100)
        with self._uow_factory(principal) as uow:
            if uow.catalogos.cargo_nombre_en_uso(nombre):
                raise ConflictError(f"El cargo {nombre} ya existe.")
            cargo = uow.catalogos.create_cargo(nombre, NivelDotacion.PERMITIDO)
            uow.commit()
            return cargo


class UpdateDotacionUseCase(_Base):
    def execute(self, principal: Principal, cargo_raw: str, tipo_raw: str, body: dict[str, Any]) -> Cargo:
        require_admin(principal)
        cargo_id, tipo_id = parse_id(cargo_raw, "cargoId"), parse_id(tipo_raw, "tipoId")
        nivel = NivelDotacion.parse(body.get("nivel"))
        restringido = parse_id_opcional(body.get("articuloRestringidoId"), "articuloRestringidoId")
        if nivel is NivelDotacion.NO_PERMITIDO:
            restringido = None
        with self._uow_factory(principal) as uow:
            if uow.catalogos.get_cargo(cargo_id) is None:
                raise NotFoundError("El cargo no existe.")
            if not uow.catalogos.tipo_existe(tipo_id):
                raise ValidationError("Tipo de equipo no válido.", details={"field": "tipoId"})
            if restringido is not None:
                articulo = uow.catalogos.get_articulo(restringido)
                if articulo is None or articulo.tipo_id != tipo_id:
                    raise ValidationError(
                        "El artículo restringido debe ser del mismo tipo.",
                        details={"field": "articuloRestringidoId"},
                    )
            uow.catalogos.upsert_dotacion(cargo_id, tipo_id, nivel, restringido)
            cargo = uow.catalogos.get_cargo(cargo_id)
            uow.commit()
            return cargo
