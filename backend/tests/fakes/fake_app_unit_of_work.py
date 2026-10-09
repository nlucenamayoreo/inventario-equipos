"""Fakes en memoria de la aplicación para tests unitarios de casos de uso."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, date, datetime

from application.ports.activos import ActivoRepository, SyncGoogleRepository
from application.ports.catalogos import CatalogoRepository
from application.ports.usuarios import UsuarioRepository
from domain.entities.activos import Activo, EstadoActivo, Movimiento
from domain.entities.catalogos import (
    Articulo,
    Cargo,
    Departamento,
    DotacionItem,
    NivelDotacion,
    Silo,
    TipoEquipo,
)
from domain.entities.usuarios import AccionVacacion, EstadoUsuario, Usuario, Vacacion
from domain.exceptions import ConflictError
from fakes.fake_app_user_repository import FakeAppUserRepository
from fakes.fake_unit_of_work import FakeUnitOfWork


def _lc(value: str | None) -> str:
    return (value or "").strip().lower()


class FakeCatalogoRepository(CatalogoRepository):
    def __init__(self) -> None:
        self.silos: dict[int, Silo] = {}
        self.deptos: dict[int, Departamento] = {}
        self.tipos: dict[int, TipoEquipo] = {}
        self.articulos: dict[int, Articulo] = {}
        self.cargos: dict[int, Cargo] = {}

    def list_silos(self) -> list[Silo]:
        return sorted(self.silos.values(), key=lambda s: s.nombre)

    def silo_existe(self, silo_id: int) -> bool:
        return silo_id in self.silos

    def silo_nombre_en_uso(self, nombre: str) -> bool:
        return any(_lc(s.nombre) == _lc(nombre) for s in self.silos.values())

    def create_silo(self, nombre: str) -> Silo:
        silo = Silo(len(self.silos) + 1, nombre)
        self.silos[silo.id] = silo
        return silo

    def list_departamentos(self) -> list[Departamento]:
        return sorted(self.deptos.values(), key=lambda d: d.nombre)

    def departamento_existe(self, departamento_id: int) -> bool:
        return departamento_id in self.deptos

    def departamento_nombre_en_uso(self, silo_id: int, nombre: str) -> bool:
        return any(d.silo_id == silo_id and _lc(d.nombre) == _lc(nombre) for d in self.deptos.values())

    def create_departamento(self, silo_id: int, nombre: str) -> Departamento:
        depto = Departamento(len(self.deptos) + 1, silo_id, nombre)
        self.deptos[depto.id] = depto
        return depto

    def list_tipos(self) -> list[TipoEquipo]:
        return sorted(self.tipos.values(), key=lambda t: t.id)

    def tipo_existe(self, tipo_id: int) -> bool:
        return tipo_id in self.tipos

    def tipo_nombre_en_uso(self, nombre: str) -> bool:
        return any(_lc(t.nombre) == _lc(nombre) for t in self.tipos.values())

    def create_tipo(self, nombre: str) -> TipoEquipo:
        tipo = TipoEquipo(len(self.tipos) + 1, nombre)
        self.tipos[tipo.id] = tipo
        return tipo

    def list_articulos(self) -> list[Articulo]:
        return sorted(self.articulos.values(), key=lambda a: a.codigo)

    def get_articulo(self, articulo_id: int) -> Articulo | None:
        return self.articulos.get(articulo_id)

    def articulo_duplicado(self, tipo_id: int, marca: str, modelo: str) -> bool:
        return any(
            a.tipo_id == tipo_id and _lc(a.marca) == _lc(marca) and _lc(a.modelo) == _lc(modelo)
            for a in self.articulos.values()
        )

    def create_articulo(
        self, tipo_id: int, marca: str, modelo: str, especificaciones: str | None, vida_util_meses: int | None
    ) -> Articulo:
        new_id = len(self.articulos) + 1
        articulo = Articulo(
            new_id, f"ART-{new_id:03d}", tipo_id, marca, modelo, especificaciones, vida_util_meses
        )
        self.articulos[new_id] = articulo
        return articulo

    def list_cargos(self) -> list[Cargo]:
        return sorted(self.cargos.values(), key=lambda c: c.nombre)

    def get_cargo(self, cargo_id: int) -> Cargo | None:
        return self.cargos.get(cargo_id)

    def cargo_nombre_en_uso(self, nombre: str) -> bool:
        return any(_lc(c.nombre) == _lc(nombre) for c in self.cargos.values())

    def create_cargo(self, nombre: str, nivel_inicial: NivelDotacion) -> Cargo:
        cargo = Cargo(
            len(self.cargos) + 1,
            nombre,
            True,
            tuple(DotacionItem(t, nivel_inicial) for t in sorted(self.tipos)),
        )
        self.cargos[cargo.id] = cargo
        return cargo

    def upsert_dotacion(
        self, cargo_id: int, tipo_id: int, nivel: NivelDotacion, articulo_restringido_id: int | None
    ) -> None:
        cargo = self.cargos[cargo_id]
        items = [d for d in cargo.dotacion if d.tipo_id != tipo_id]
        items.append(DotacionItem(tipo_id, nivel, articulo_restringido_id))
        self.cargos[cargo_id] = replace(cargo, dotacion=tuple(sorted(items, key=lambda d: d.tipo_id)))


class FakeUsuarioRepository(UsuarioRepository):
    def __init__(self) -> None:
        self.rows: dict[int, Usuario] = {}
        self.vacaciones: list[Vacacion] = []

    def _con_vacacion(self, usuario: Usuario) -> Usuario:
        abierta = next(
            (v for v in self.vacaciones if v.usuario_id == usuario.id and v.finalizada_en is None), None
        )
        return replace(usuario, vacacion=abierta)

    def list_visibles(self) -> list[Usuario]:
        return [
            self._con_vacacion(u)
            for u in sorted(self.rows.values(), key=lambda u: u.nombre)
            if u.estado is not EstadoUsuario.ELIMINADO
        ]

    def get(self, usuario_id: int) -> Usuario | None:
        usuario = self.rows.get(usuario_id)
        if usuario is None or usuario.estado is EstadoUsuario.ELIMINADO:
            return None
        return self._con_vacacion(usuario)

    def estado_por_codigo(self, codigo: str, excluir_id: int | None = None) -> EstadoUsuario | None:
        return next(
            (u.estado for u in self.rows.values() if _lc(u.codigo) == _lc(codigo) and u.id != excluir_id),
            None,
        )

    def correo_en_uso(self, correo: str, excluir_id: int | None = None) -> bool:
        return any(_lc(u.correo) == _lc(correo) and u.id != excluir_id for u in self.rows.values())

    def create(
        self, codigo: str, nombre: str, correo: str | None, cargo_id: int, departamento_id: int
    ) -> Usuario:
        usuario = Usuario(
            len(self.rows) + 1, codigo, nombre, correo, cargo_id, departamento_id, EstadoUsuario.ACTIVO
        )
        self.rows[usuario.id] = usuario
        return usuario

    def save(self, usuario: Usuario) -> Usuario:
        self.rows[usuario.id] = replace(usuario, vacacion=None)
        return self.get(usuario.id) or usuario

    def create_vacacion(
        self,
        usuario_id: int,
        desde: date,
        hasta: date,
        accion: AccionVacacion,
        suplente_id: int | None,
        nota: str | None,
    ) -> None:
        self.vacaciones.append(
            Vacacion(len(self.vacaciones) + 1, usuario_id, desde, hasta, accion, suplente_id, nota)
        )

    def finalizar_vacacion(self, usuario_id: int) -> None:
        ahora = datetime.now(UTC)
        self.vacaciones = [
            replace(v, finalizada_en=ahora) if v.usuario_id == usuario_id and v.finalizada_en is None else v
            for v in self.vacaciones
        ]

    def quitar_suplente(self, suplente_id: int) -> int:
        cambiadas = 0
        for i, v in enumerate(self.vacaciones):
            if v.suplente_id == suplente_id and v.finalizada_en is None:
                self.vacaciones[i] = replace(v, accion=AccionVacacion.RESGUARDO, suplente_id=None)
                cambiadas += 1
        return cambiadas


class FakeActivoRepository(ActivoRepository):
    def __init__(self, usuarios: FakeUsuarioRepository) -> None:
        self._usuarios = usuarios
        self.rows: dict[int, Activo] = {}
        self.movs: list[Movimiento] = []

    def list_all(self) -> list[Activo]:
        return [self.rows[k] for k in sorted(self.rows)]

    def get(self, activo_id: int) -> Activo | None:
        return self.rows.get(activo_id)

    def serial_en_uso(self, serial: str) -> bool:
        return any(_lc(a.serial) == _lc(serial) for a in self.rows.values())

    def create(
        self, articulo_id: int, serial: str, estado: EstadoActivo, usuario_id: int | None, fecha: date | None
    ) -> Activo:
        if self.serial_en_uso(serial):
            raise ConflictError("El registro ya existe.")
        activo = Activo(len(self.rows) + 1, articulo_id, serial, estado, usuario_id, None, fecha)
        self.rows[activo.id] = activo
        return activo

    def save(self, activo: Activo) -> None:
        assert (activo.usuario_id is not None) == activo.estado.requiere_titular, "CHECK titular"
        assert (activo.prestado_a is not None) == (activo.estado is EstadoActivo.PRESTAMO), "CHECK préstamo"
        self.rows[activo.id] = activo

    def de_titular(self, usuario_id: int) -> list[Activo]:
        return [a for a in self.list_all() if a.usuario_id == usuario_id]

    def prestados_a(self, usuario_id: int) -> list[Activo]:
        return [
            a for a in self.list_all() if a.prestado_a == usuario_id and a.estado is EstadoActivo.PRESTAMO
        ]

    def add_movimiento(self, antes: Activo | None, despues: Activo, motivo: str, realizado_por: str) -> None:
        self.movs.append(
            Movimiento(
                len(self.movs) + 1,
                despues.id,
                antes.estado if antes else None,
                despues.estado,
                antes.usuario_id if antes else None,
                despues.usuario_id,
                motivo,
                realizado_por,
                datetime.now(UTC),
            )
        )

    def movimientos(self, activo_id: int) -> list[Movimiento]:
        nombre = {u.id: u.nombre for u in self._usuarios.rows.values()}
        return [
            replace(
                m,
                usuario_anterior_nombre=nombre.get(m.usuario_anterior),
                usuario_nuevo_nombre=nombre.get(m.usuario_nuevo),
            )
            for m in reversed(self.movs)
            if m.activo_id == activo_id
        ]


class FakeSyncGoogleRepository(SyncGoogleRepository):
    def __init__(self) -> None:
        self.valor: dict = {"ultimaExitosa": None, "ultimaCorrida": None}

    def estado(self) -> dict:
        return self.valor


class FakeAppUnitOfWork(FakeUnitOfWork):
    def __init__(self) -> None:
        super().__init__()
        self.catalogos = FakeCatalogoRepository()
        self.usuarios = FakeUsuarioRepository()
        self.activos = FakeActivoRepository(self.usuarios)
        self.sync = FakeSyncGoogleRepository()
        self.app_users = FakeAppUserRepository()
        self.principals: list = []

    def factory(self, principal=None) -> FakeAppUnitOfWork:
        self.principals.append(principal)
        return self
