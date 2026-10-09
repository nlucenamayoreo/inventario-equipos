"""Cargas masivas desde los machotes de Excel (el navegador lee el archivo y envía las filas en JSON).

Las filas se procesan en orden dentro de una sola transacción, con las mismas reglas del alta individual
(así una fila puede usar la marca o el modelo creado por una fila anterior). Si alguna fila falla, o si es una
vista previa (``confirmar = false``), la transacción se deshace y no queda nada a medias.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date
from typing import Any

from application.dto.principal import Principal
from application.ports.app_unit_of_work import AppUnitOfWork, UnitOfWorkFactory
from application.use_cases.activos import alta_activo
from application.use_cases.common import correo, require, texto
from application.use_cases.usuarios import alta_usuario
from domain.entities.activos import EstadoActivo
from domain.entities.catalogos import Articulo
from domain.entities.seguridad import ACTIVOS_REGISTRAR, ARTICULOS, USUARIOS
from domain.exceptions import DomainError, ForbiddenError, ValidationError

MAX_FILAS = 1000
_ESTADOS = {
    "disponible": EstadoActivo.DISPONIBLE,
    "en reparación": EstadoActivo.EN_REPARACION,
    "en reparacion": EstadoActivo.EN_REPARACION,
    "de baja": EstadoActivo.DE_BAJA,
}


def _filas(body: dict[str, Any]) -> list[dict[str, Any]]:
    filas = body.get("filas")
    if not isinstance(filas, list) or not filas:
        raise ValidationError("El archivo no tiene filas para cargar.", details={"field": "filas"})
    if len(filas) > MAX_FILAS:
        raise ValidationError(f"Máximo {MAX_FILAS} filas por carga.", details={"field": "filas"})
    return [f if isinstance(f, dict) else {} for f in filas]


def _celda(fila: dict[str, Any], clave: str) -> str | None:
    value = fila.get(clave)
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def _obligatorio(fila: dict[str, Any], clave: str, etiqueta: str) -> str:
    value = _celda(fila, clave)
    if value is None:
        raise ValidationError(f"Falta {etiqueta}.")
    return value


class _Importacion:
    def __init__(self, uow_factory: UnitOfWorkFactory, today: Callable[[], date] = date.today) -> None:
        self._uow_factory = uow_factory
        self.hoy = today

    def _procesar(self, principal: Principal, body: dict[str, Any], fila_fn) -> dict:
        filas = _filas(body)
        confirmar = body.get("confirmar") is True
        resultados = []
        with self._uow_factory(principal) as uow:
            contexto = self._contexto(uow)
            for numero, fila in enumerate(filas, start=2):  # fila 1 = encabezados en el Excel
                try:
                    with uow.savepoint():
                        detalle = fila_fn(uow, principal, fila, contexto)
                    resultados.append({"fila": numero, "ok": True, "detalle": detalle})
                except DomainError as error:
                    resultados.append({"fila": numero, "ok": False, "detalle": error.message})
            errores = sum(1 for r in resultados if not r["ok"])
            aplicado = confirmar and errores == 0
            if aplicado:
                uow.commit()
        return {
            "filas": resultados,
            "errores": errores,
            "validas": len(resultados) - errores,
            "aplicado": aplicado,
        }

    def _contexto(self, uow: AppUnitOfWork) -> dict:
        return {}


class ImportUsuariosUseCase(_Importacion):
    """Columnas: codigo, nombre, correo, cargo, departamento, silo (distingue departamentos homónimos)."""

    def execute(self, principal: Principal, body: dict[str, Any]) -> dict:
        require(principal, USUARIOS)
        return self._procesar(principal, body, self._fila)

    def _contexto(self, uow: AppUnitOfWork) -> dict:
        silos = {s.id: s.nombre.lower() for s in uow.catalogos.list_silos()}
        return {
            "cargos": {c.nombre.lower(): c.id for c in uow.catalogos.list_cargos()},
            "deptos": [
                (d.nombre.lower(), silos.get(d.silo_id), d.id) for d in uow.catalogos.list_departamentos()
            ],
        }

    @staticmethod
    def _fila(uow: AppUnitOfWork, principal: Principal, fila: dict[str, Any], ctx: dict) -> str:
        codigo = texto(_obligatorio(fila, "codigo", "el código"), "codigo", "", maximo=40)
        nombre = texto(_obligatorio(fila, "nombre", "el nombre"), "nombre", "", maximo=150)
        mail = correo(_celda(fila, "correo"))
        cargo_id = ctx["cargos"].get(_obligatorio(fila, "cargo", "el cargo").lower())
        if cargo_id is None:
            raise ValidationError(f"El cargo «{fila.get('cargo')}» no existe en el catálogo.")
        depto = _obligatorio(fila, "departamento", "el departamento").lower()
        silo = (_celda(fila, "silo") or "").lower()
        candidatos = [d for n, s, d in ctx["deptos"] if n == depto and (not silo or s == silo)]
        if len(candidatos) != 1:
            raise ValidationError(
                f"El departamento «{fila.get('departamento')}» no existe"
                + (" en ese silo." if silo else " o se repite en varios silos: indique el silo.")
            )
        usuario = alta_usuario(uow, codigo, nombre, mail, cargo_id, candidatos[0])
        return f"{usuario.codigo} · {usuario.nombre}"


class ImportActivosUseCase(_Importacion):
    """Columnas: tipo, marca, modelo, especificaciones, caracteristicas («RAM: 16 GB; Disco: 512 GB»), serial,
    estado (Disponible / En reparación / De baja), codigo_usuario (asignar), correo_custodio.

    Marcas, modelos, artículos y valores de características que no existen se crean (requiere el permiso de
    artículos); el artículo se identifica por tipo + marca + modelo."""

    def execute(self, principal: Principal, body: dict[str, Any]) -> dict:
        require(principal, ACTIVOS_REGISTRAR)
        return self._procesar(principal, body, self._fila)

    def _contexto(self, uow: AppUnitOfWork) -> dict:
        return {
            "tipos": {t.nombre.lower(): t for t in uow.catalogos.list_tipos()},
            "operadores": {o.correo.lower(): o for o in uow.seguridad.list_operadores()},
        }

    def _fila(self, uow: AppUnitOfWork, principal: Principal, fila: dict[str, Any], ctx: dict) -> str:
        tipo = ctx["tipos"].get(_obligatorio(fila, "tipo", "el tipo").lower())
        if tipo is None:
            raise ValidationError(f"El tipo «{fila.get('tipo')}» no existe en el catálogo.")
        articulo = self._articulo(uow, principal, tipo.id, fila)
        serial = texto(_obligatorio(fila, "serial", "el serial"), "serial", "", maximo=100)
        estado = _ESTADOS.get((_celda(fila, "estado") or "disponible").lower())
        if estado is None:
            raise ValidationError("Estado no válido: use Disponible, En reparación o De baja.")
        usuario_id = None
        if codigo := _celda(fila, "codigo_usuario"):
            usuario = uow.usuarios.por_codigo(codigo)
            if usuario is None:
                raise ValidationError(f"No existe un usuario con el código {codigo}.")
            usuario_id = usuario.id
        custodio_raw = None
        if mail := _celda(fila, "correo_custodio"):
            persona = ctx["operadores"].get(mail.lower())
            if persona is None:
                raise ValidationError(f"{mail} no es una persona con acceso a la aplicación.")
            custodio_raw = persona.id
        activo = alta_activo(uow, principal, articulo, serial, estado, usuario_id, custodio_raw, self.hoy())
        return f"{articulo.codigo} · {activo.serial}" + (f" → {codigo}" if usuario_id else "")

    @staticmethod
    def _articulo(uow: AppUnitOfWork, principal: Principal, tipo_id: int, fila: dict[str, Any]) -> Articulo:
        marca_txt = texto(_obligatorio(fila, "marca", "la marca"), "marca", "", maximo=80)
        modelo_txt = texto(_obligatorio(fila, "modelo", "el modelo"), "modelo", "", maximo=120)

        def crear(que: str):
            if not principal.puede(ARTICULOS):
                raise ForbiddenError(f"{que} no existe y su rol no permite crearlo en el catálogo.")

        marca = uow.catalogos.marca_por_nombre(marca_txt)
        if marca is None:
            crear(f"La marca {marca_txt}")
            marca = uow.catalogos.create_marca(marca_txt)
        modelo = uow.catalogos.modelo_por_nombre(marca.id, tipo_id, modelo_txt)
        if modelo is None:
            crear(f"El modelo {modelo_txt}")
            modelo = uow.catalogos.create_modelo(marca.id, tipo_id, modelo_txt)
        articulo = uow.catalogos.articulo_por_modelo(tipo_id, marca.nombre, modelo.nombre)
        if articulo is not None:
            return articulo
        crear(f"El artículo {marca.nombre} {modelo.nombre}")
        elegidas = []
        for parte in (_celda(fila, "caracteristicas") or "").split(";"):
            if ":" not in parte:
                continue
            nombre, valor = (x.strip() for x in parte.split(":", 1))
            if not nombre or not valor:
                continue
            caracteristica = uow.catalogos.caracteristica_por_nombre(
                tipo_id, nombre
            ) or uow.catalogos.create_caracteristica(tipo_id, nombre)
            caracteristica = uow.catalogos.add_valor(caracteristica.id, valor)
            elegido = next(v for v in caracteristica.valores if v.valor.lower() == valor.lower())
            elegidas.append((caracteristica.id, elegido.id))
        specs = texto(_celda(fila, "especificaciones"), "especificaciones", "", requerido=False, maximo=500)
        return uow.catalogos.create_articulo(
            tipo_id,
            marca.nombre,
            modelo.nombre,
            specs,
            None,
            modelo_id=modelo.id,
            caracteristicas=tuple(sorted(dict(elegidas).items())),
        )
