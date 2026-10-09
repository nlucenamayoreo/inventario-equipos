"""Casos de uso de catálogos: silos, departamentos, tipos, marcas, modelos, características, artículos
y cargos."""

from __future__ import annotations

from typing import Any

from application.dto.principal import Principal
from application.ports.app_unit_of_work import AppUnitOfWork, UnitOfWorkFactory
from application.use_cases.common import parse_id, parse_id_opcional, require, texto
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
from domain.entities.seguridad import ARTICULOS, CATALOGOS
from domain.exceptions import ConflictError, NotFoundError, ValidationError


class _Base:
    def __init__(self, uow_factory: UnitOfWorkFactory) -> None:
        self._uow_factory = uow_factory


def _activo(body: dict[str, Any], actual: bool) -> bool:
    value = body.get("activo", actual)
    if not isinstance(value, bool):
        raise ValidationError("'activo' debe ser verdadero o falso.", details={"field": "activo"})
    return value


# ------------------------------------------------------------------ silos y departamentos
class ListSilosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Silo]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_silos()


class CreateSiloUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Silo:
        require(principal, CATALOGOS)
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
        require(principal, CATALOGOS)
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


# ------------------------------------------------------------------ tipos de equipo
class ListTiposEquipoUseCase(_Base):
    def execute(self, principal: Principal) -> list[TipoEquipo]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_tipos()


class CreateTipoEquipoUseCase(_Base):
    """Tipo nuevo: sin filas de dotación, queda «no permitido» en todos los cargos."""

    def execute(self, principal: Principal, body: dict[str, Any]) -> TipoEquipo:
        require(principal, CATALOGOS)
        nombre = texto(body.get("nombre"), "nombre", "Indique el tipo de equipo.", maximo=60)
        with self._uow_factory(principal) as uow:
            if uow.catalogos.tipo_nombre_en_uso(nombre):
                raise ConflictError(f"El tipo {nombre} ya existe.")
            tipo = uow.catalogos.create_tipo(nombre)
            uow.commit()
            return tipo


class UpdateTipoEquipoUseCase(_Base):
    """Nombre y máximo de equipos de este tipo por persona."""

    def execute(self, principal: Principal, tipo_raw: str, body: dict[str, Any]) -> TipoEquipo:
        require(principal, CATALOGOS)
        tipo_id = parse_id(tipo_raw, "tipoId")
        with self._uow_factory(principal) as uow:
            tipo = uow.catalogos.get_tipo(tipo_id)
            if tipo is None:
                raise NotFoundError("El tipo de equipo no existe.")
            nombre = texto(body.get("nombre", tipo.nombre), "nombre", "Indique el tipo de equipo.", maximo=60)
            maximo = body.get("maxPorUsuario", tipo.limite)
            if not isinstance(maximo, int) or isinstance(maximo, bool) or not 1 <= maximo <= 20:
                raise ValidationError(
                    "El máximo por persona debe ser un entero entre 1 y 20.",
                    details={"field": "maxPorUsuario"},
                )
            if nombre.lower() != tipo.nombre.lower() and uow.catalogos.tipo_nombre_en_uso(nombre):
                raise ConflictError(f"El tipo {nombre} ya existe.")
            tipo = uow.catalogos.update_tipo(tipo_id, nombre, maximo)
            uow.commit()
            return tipo


# ------------------------------------------------------------------ marcas
class ListMarcasUseCase(_Base):
    def execute(self, principal: Principal) -> list[Marca]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_marcas()


class CreateMarcaUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Marca:
        require(principal, ARTICULOS)
        nombre = texto(body.get("nombre"), "nombre", "Indique el nombre de la marca.", maximo=80)
        with self._uow_factory(principal) as uow:
            if uow.catalogos.marca_por_nombre(nombre):
                raise ConflictError(f"La marca {nombre} ya existe.")
            marca = uow.catalogos.create_marca(nombre)
            uow.commit()
            return marca


class UpdateMarcaUseCase(_Base):
    def execute(self, principal: Principal, marca_raw: str, body: dict[str, Any]) -> Marca:
        require(principal, ARTICULOS)
        marca_id = parse_id(marca_raw, "marcaId")
        with self._uow_factory(principal) as uow:
            marca = uow.catalogos.get_marca(marca_id)
            if marca is None:
                raise NotFoundError("La marca no existe.")
            nombre = texto(
                body.get("nombre", marca.nombre), "nombre", "Indique el nombre de la marca.", maximo=80
            )
            otra = uow.catalogos.marca_por_nombre(nombre)
            if otra and otra.id != marca_id:
                raise ConflictError(f"La marca {nombre} ya existe.")
            marca = uow.catalogos.update_marca(marca_id, nombre, _activo(body, marca.activo))
            uow.commit()
            return marca


# ------------------------------------------------------------------ modelos
class ListModelosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Modelo]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_modelos()


class CreateModeloUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Modelo:
        require(principal, ARTICULOS)
        mensaje = "Marca, tipo y nombre del modelo son obligatorios."
        if body.get("marcaId") in (None, "") or body.get("tipoId") in (None, ""):
            raise ValidationError(mensaje)
        marca_id, tipo_id = parse_id(body.get("marcaId"), "marcaId"), parse_id(body.get("tipoId"), "tipoId")
        nombre = texto(body.get("nombre"), "nombre", mensaje, maximo=120)
        with self._uow_factory(principal) as uow:
            if uow.catalogos.get_marca(marca_id) is None:
                raise ValidationError("Seleccione una marca válida.", details={"field": "marcaId"})
            if not uow.catalogos.tipo_existe(tipo_id):
                raise ValidationError("Seleccione un tipo válido.", details={"field": "tipoId"})
            if uow.catalogos.modelo_por_nombre(marca_id, tipo_id, nombre):
                raise ConflictError(f"El modelo {nombre} ya existe para esa marca y tipo.")
            modelo = uow.catalogos.create_modelo(marca_id, tipo_id, nombre)
            uow.commit()
            return modelo


class UpdateModeloUseCase(_Base):
    def execute(self, principal: Principal, modelo_raw: str, body: dict[str, Any]) -> Modelo:
        require(principal, ARTICULOS)
        modelo_id = parse_id(modelo_raw, "modeloId")
        with self._uow_factory(principal) as uow:
            modelo = uow.catalogos.get_modelo(modelo_id)
            if modelo is None:
                raise NotFoundError("El modelo no existe.")
            nombre = texto(
                body.get("nombre", modelo.nombre), "nombre", "Indique el nombre del modelo.", maximo=120
            )
            otro = uow.catalogos.modelo_por_nombre(modelo.marca_id, modelo.tipo_id, nombre)
            if otro and otro.id != modelo_id:
                raise ConflictError(f"El modelo {nombre} ya existe para esa marca y tipo.")
            modelo = uow.catalogos.update_modelo(modelo_id, nombre, _activo(body, modelo.activo))
            uow.commit()
            return modelo


# ------------------------------------------------------------------ características por tipo
class ListCaracteristicasUseCase(_Base):
    def execute(self, principal: Principal) -> list[Caracteristica]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_caracteristicas()


def _valores(body: dict[str, Any]) -> list[str]:
    raw = body.get("valores") or []
    if not isinstance(raw, list):
        raise ValidationError("'valores' debe ser una lista.", details={"field": "valores"})
    return [v for v in (texto(x, "valores", "", requerido=False, maximo=80) for x in raw) if v]


class CreateCaracteristicaUseCase(_Base):
    def execute(self, principal: Principal, body: dict[str, Any]) -> Caracteristica:
        require(principal, ARTICULOS)
        mensaje = "Tipo y nombre de la característica son obligatorios."
        if body.get("tipoId") in (None, ""):
            raise ValidationError(mensaje, details={"field": "tipoId"})
        tipo_id = parse_id(body.get("tipoId"), "tipoId")
        nombre = texto(body.get("nombre"), "nombre", mensaje, maximo=60)
        valores = _valores(body)
        with self._uow_factory(principal) as uow:
            if not uow.catalogos.tipo_existe(tipo_id):
                raise ValidationError("Seleccione un tipo válido.", details={"field": "tipoId"})
            if uow.catalogos.caracteristica_por_nombre(tipo_id, nombre):
                raise ConflictError(f"La característica {nombre} ya existe para ese tipo.")
            caracteristica = uow.catalogos.create_caracteristica(tipo_id, nombre)
            for valor in valores:
                caracteristica = uow.catalogos.add_valor(caracteristica.id, valor)
            uow.commit()
            return caracteristica


class UpdateCaracteristicaUseCase(_Base):
    """Renombrar, activar/desactivar y agregar valores (los valores existentes no se borran)."""

    def execute(self, principal: Principal, caracteristica_raw: str, body: dict[str, Any]) -> Caracteristica:
        require(principal, ARTICULOS)
        caracteristica_id = parse_id(caracteristica_raw, "caracteristicaId")
        nuevos = _valores(body)
        with self._uow_factory(principal) as uow:
            actual = uow.catalogos.get_caracteristica(caracteristica_id)
            if actual is None:
                raise NotFoundError("La característica no existe.")
            nombre = texto(body.get("nombre", actual.nombre), "nombre", "Indique el nombre.", maximo=60)
            otra = uow.catalogos.caracteristica_por_nombre(actual.tipo_id, nombre)
            if otra and otra.id != caracteristica_id:
                raise ConflictError(f"La característica {nombre} ya existe para ese tipo.")
            caracteristica = uow.catalogos.update_caracteristica(
                caracteristica_id, nombre, _activo(body, actual.activo)
            )
            for valor in nuevos:
                caracteristica = uow.catalogos.add_valor(caracteristica_id, valor)
            uow.commit()
            return caracteristica


# ------------------------------------------------------------------ artículos
class ListArticulosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Articulo]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_articulos()


def validar_caracteristicas(uow: AppUnitOfWork, tipo_id: int, raw: Any) -> tuple[tuple[int, int], ...]:
    """Lista ``[{caracteristicaId, valorId}]``: características del tipo con un valor propio de cada una."""
    if raw in (None, ""):
        return ()
    if not isinstance(raw, list):
        raise ValidationError("'caracteristicas' debe ser una lista.", details={"field": "caracteristicas"})
    elegidas: dict[int, int] = {}
    for item in raw:
        if not isinstance(item, dict) or item.get("valorId") in (None, ""):
            continue
        c_id = parse_id(item.get("caracteristicaId"), "caracteristicaId")
        v_id = parse_id(item.get("valorId"), "valorId")
        caracteristica = uow.catalogos.get_caracteristica(c_id)
        if caracteristica is None or caracteristica.tipo_id != tipo_id or caracteristica.valor(v_id) is None:
            raise ValidationError(
                "Las características no corresponden al tipo de equipo.", details={"field": "caracteristicas"}
            )
        elegidas[c_id] = v_id
    return tuple(sorted(elegidas.items()))


class CreateArticuloUseCase(_Base):
    """El artículo se crea a partir de un modelo del catálogo (que define tipo y marca)."""

    def execute(self, principal: Principal, body: dict[str, Any]) -> Articulo:
        require(principal, ARTICULOS)
        if body.get("modeloId") in (None, ""):
            raise ValidationError(
                "Seleccione el modelo (tipo y marca salen del modelo).", details={"field": "modeloId"}
            )
        modelo_id = parse_id(body.get("modeloId"), "modeloId")
        specs = texto(body.get("especificaciones"), "especificaciones", "", requerido=False, maximo=500)
        vida = body.get("vidaUtilMeses")
        if vida not in (None, "") and (not isinstance(vida, int) or isinstance(vida, bool) or vida < 0):
            raise ValidationError(
                "La vida útil debe ser un número entero de meses.", details={"field": "vidaUtilMeses"}
            )
        with self._uow_factory(principal) as uow:
            articulo = crear_articulo(
                uow, modelo_id, specs, vida if vida != "" else None, body.get("caracteristicas")
            )
            uow.commit()
            return articulo


def crear_articulo(
    uow: AppUnitOfWork, modelo_id: int, specs: str | None, vida: int | None, caracteristicas: Any
) -> Articulo:
    modelo = uow.catalogos.get_modelo(modelo_id)
    if modelo is None or not modelo.activo:
        raise ValidationError("Seleccione un modelo válido.", details={"field": "modeloId"})
    marca = uow.catalogos.get_marca(modelo.marca_id)
    if uow.catalogos.articulo_duplicado(modelo.tipo_id, marca.nombre, modelo.nombre):
        raise ConflictError("Ese artículo ya existe en el catálogo.", code="articulo_duplicado")
    elegidas = validar_caracteristicas(uow, modelo.tipo_id, caracteristicas)
    return uow.catalogos.create_articulo(
        modelo.tipo_id,
        marca.nombre,
        modelo.nombre,
        specs,
        vida,
        modelo_id=modelo.id,
        caracteristicas=elegidas,
    )


# ------------------------------------------------------------------ cargos y dotación
class ListCargosUseCase(_Base):
    def execute(self, principal: Principal) -> list[Cargo]:
        with self._uow_factory(principal) as uow:
            return uow.catalogos.list_cargos()


class CreateCargoUseCase(_Base):
    """Cargo nuevo: todos los tipos nacen «permitido» (se muestran como Opcional)."""

    def execute(self, principal: Principal, body: dict[str, Any]) -> Cargo:
        require(principal, CATALOGOS)
        nombre = texto(body.get("nombre"), "nombre", "Indique el nombre del cargo.", maximo=100)
        with self._uow_factory(principal) as uow:
            if uow.catalogos.cargo_nombre_en_uso(nombre):
                raise ConflictError(f"El cargo {nombre} ya existe.")
            cargo = uow.catalogos.create_cargo(nombre, NivelDotacion.PERMITIDO)
            uow.commit()
            return cargo


class UpdateDotacionUseCase(_Base):
    def execute(self, principal: Principal, cargo_raw: str, tipo_raw: str, body: dict[str, Any]) -> Cargo:
        require(principal, CATALOGOS)
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
