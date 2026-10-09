"""Fakes en memoria de la aplicación para tests unitarios de casos de uso."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import replace
from datetime import UTC, date, datetime

from application.ports.activos import ActivoRepository, SyncGoogleRepository
from application.ports.catalogos import CatalogoRepository
from application.ports.reasignaciones import ReasignacionRepository
from application.ports.seguridad import DirectorioIdentidad, SeguridadRepository
from application.ports.usuarios import UsuarioRepository
from domain.entities.activos import Activo, EstadoActivo, EstadoReasignacion, Movimiento, Reasignacion
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
from domain.entities.seguridad import Operador, Permiso, Rol
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
        self.marcas: dict[int, Marca] = {}
        self.modelos: dict[int, Modelo] = {}
        self.caracteristicas: dict[int, Caracteristica] = {}
        self._valores = 0

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

    def get_tipo(self, tipo_id: int) -> TipoEquipo | None:
        return self.tipos.get(tipo_id)

    def update_tipo(self, tipo_id: int, nombre: str, max_por_usuario: int) -> TipoEquipo:
        self.tipos[tipo_id] = replace(self.tipos[tipo_id], nombre=nombre, max_por_usuario=max_por_usuario)
        return self.tipos[tipo_id]

    def list_marcas(self) -> list[Marca]:
        return sorted(self.marcas.values(), key=lambda m: m.nombre)

    def get_marca(self, marca_id: int) -> Marca | None:
        return self.marcas.get(marca_id)

    def marca_por_nombre(self, nombre: str) -> Marca | None:
        return next((m for m in self.marcas.values() if _lc(m.nombre) == _lc(nombre)), None)

    def create_marca(self, nombre: str) -> Marca:
        marca = Marca(len(self.marcas) + 1, nombre)
        self.marcas[marca.id] = marca
        return marca

    def update_marca(self, marca_id: int, nombre: str, activo: bool) -> Marca:
        self.marcas[marca_id] = replace(self.marcas[marca_id], nombre=nombre, activo=activo)
        return self.marcas[marca_id]

    def list_modelos(self) -> list[Modelo]:
        return sorted(self.modelos.values(), key=lambda m: m.nombre)

    def get_modelo(self, modelo_id: int) -> Modelo | None:
        return self.modelos.get(modelo_id)

    def modelo_por_nombre(self, marca_id: int, tipo_id: int, nombre: str) -> Modelo | None:
        return next(
            (
                m
                for m in self.modelos.values()
                if m.marca_id == marca_id and m.tipo_id == tipo_id and _lc(m.nombre) == _lc(nombre)
            ),
            None,
        )

    def create_modelo(self, marca_id: int, tipo_id: int, nombre: str) -> Modelo:
        modelo = Modelo(len(self.modelos) + 1, marca_id, tipo_id, nombre)
        self.modelos[modelo.id] = modelo
        return modelo

    def update_modelo(self, modelo_id: int, nombre: str, activo: bool) -> Modelo:
        self.modelos[modelo_id] = replace(self.modelos[modelo_id], nombre=nombre, activo=activo)
        return self.modelos[modelo_id]

    def list_caracteristicas(self) -> list[Caracteristica]:
        return sorted(self.caracteristicas.values(), key=lambda c: (c.tipo_id, c.nombre))

    def get_caracteristica(self, caracteristica_id: int) -> Caracteristica | None:
        return self.caracteristicas.get(caracteristica_id)

    def caracteristica_por_nombre(self, tipo_id: int, nombre: str) -> Caracteristica | None:
        return next(
            (
                c
                for c in self.caracteristicas.values()
                if c.tipo_id == tipo_id and _lc(c.nombre) == _lc(nombre)
            ),
            None,
        )

    def create_caracteristica(self, tipo_id: int, nombre: str) -> Caracteristica:
        caracteristica = Caracteristica(len(self.caracteristicas) + 1, tipo_id, nombre)
        self.caracteristicas[caracteristica.id] = caracteristica
        return caracteristica

    def update_caracteristica(self, caracteristica_id: int, nombre: str, activo: bool) -> Caracteristica:
        actual = self.caracteristicas[caracteristica_id]
        self.caracteristicas[caracteristica_id] = replace(actual, nombre=nombre, activo=activo)
        return self.caracteristicas[caracteristica_id]

    def add_valor(self, caracteristica_id: int, valor: str) -> Caracteristica:
        actual = self.caracteristicas[caracteristica_id]
        if not any(_lc(v.valor) == _lc(valor) for v in actual.valores):
            self._valores += 1
            valores = (*actual.valores, ValorCaracteristica(self._valores, valor))
            self.caracteristicas[caracteristica_id] = replace(actual, valores=valores)
        return self.caracteristicas[caracteristica_id]

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
        self,
        tipo_id: int,
        marca: str,
        modelo: str,
        especificaciones: str | None,
        vida_util_meses: int | None,
        modelo_id: int | None = None,
        caracteristicas: tuple[tuple[int, int], ...] = (),
    ) -> Articulo:
        new_id = len(self.articulos) + 1
        articulo = Articulo(
            new_id,
            f"ART-{new_id:03d}",
            tipo_id,
            marca,
            modelo,
            especificaciones,
            vida_util_meses,
            modelo_id=modelo_id,
            caracteristicas=tuple(caracteristicas),
        )
        self.articulos[new_id] = articulo
        return articulo

    def articulo_por_modelo(self, tipo_id: int, marca: str, modelo: str) -> Articulo | None:
        return next(
            (
                a
                for a in self.articulos.values()
                if a.tipo_id == tipo_id and _lc(a.marca) == _lc(marca) and _lc(a.modelo) == _lc(modelo)
            ),
            None,
        )

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

    def por_codigo(self, codigo: str) -> Usuario | None:
        return next(
            (
                self._con_vacacion(u)
                for u in self.rows.values()
                if _lc(u.codigo) == _lc(codigo) and u.estado is not EstadoUsuario.ELIMINADO
            ),
            None,
        )

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
    def __init__(self, usuarios: FakeUsuarioRepository, catalogos: FakeCatalogoRepository) -> None:
        self._usuarios = usuarios
        self._catalogos = catalogos
        self.rows: dict[int, Activo] = {}
        self.movs: list[Movimiento] = []

    def list_all(self) -> list[Activo]:
        return [self.rows[k] for k in sorted(self.rows)]

    def get(self, activo_id: int) -> Activo | None:
        return self.rows.get(activo_id)

    def serial_en_uso(self, serial: str) -> bool:
        return any(_lc(a.serial) == _lc(serial) for a in self.rows.values())

    def create(
        self,
        articulo_id: int,
        serial: str,
        estado: EstadoActivo,
        usuario_id: int | None,
        fecha: date | None,
        custodio_id: int | None,
    ) -> Activo:
        if self.serial_en_uso(serial):
            raise ConflictError("El registro ya existe.")
        activo = Activo(len(self.rows) + 1, articulo_id, serial, estado, usuario_id, None, fecha, custodio_id)
        self._check(activo)
        self.rows[activo.id] = activo
        return activo

    @staticmethod
    def _check(activo: Activo) -> None:
        assert (activo.custodio_id is not None) or not activo.estado.requiere_custodio, "CHECK custodio"

    def save(self, activo: Activo) -> None:
        self._check(activo)
        assert (activo.usuario_id is not None) == activo.estado.requiere_titular, "CHECK titular"
        assert (activo.prestado_a is not None) == (activo.estado is EstadoActivo.PRESTAMO), "CHECK préstamo"
        self.rows[activo.id] = activo

    def de_titular(self, usuario_id: int) -> list[Activo]:
        return [a for a in self.list_all() if a.usuario_id == usuario_id]

    def prestados_a(self, usuario_id: int) -> list[Activo]:
        return [
            a for a in self.list_all() if a.prestado_a == usuario_id and a.estado is EstadoActivo.PRESTAMO
        ]

    def tenencia_por_tipo(self, usuario_id: int, tipo_id: int) -> int:
        def del_tipo(a: Activo) -> bool:
            return self._catalogos.articulos[a.articulo_id].tipo_id == tipo_id

        propios = [a for a in self.de_titular(usuario_id) if del_tipo(a)]
        return len(propios) + len([a for a in self.prestados_a(usuario_id) if del_tipo(a)])

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
                custodio_anterior=antes.custodio_id if antes else None,
                custodio_nuevo=despues.custodio_id,
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


PERMISOS = (
    Permiso("catalogos.gestionar", "Catálogos", "Silos, departamentos, tipos, cargos"),
    Permiso("articulos.gestionar", "Catálogos", "Marcas, modelos, características y artículos"),
    Permiso("usuarios.gestionar", "Usuarios", "Alta, edición, vacaciones y baja"),
    Permiso("activos.registrar", "Activos", "Registrar equipos"),
    Permiso("activos.asignar", "Activos", "Asignar, liberar y cambiar estado"),
    Permiso("reasignaciones.solicitar", "Reasignaciones", "Solicitar reasignaciones"),
    Permiso("reasignaciones.aprobar", "Reasignaciones", "Aprobar o rechazar reasignaciones"),
    Permiso("seguridad.gestionar", "Seguridad", "Roles y personas con acceso"),
)


class FakeSeguridadRepository(SeguridadRepository):
    def __init__(self) -> None:
        self.roles: dict[int, Rol] = {}
        self.operadores: dict[int, Operador] = {}

    def list_permisos(self) -> list[Permiso]:
        return list(PERMISOS)

    def list_roles(self) -> list[Rol]:
        return sorted(self.roles.values(), key=lambda r: r.nombre)

    def get_rol(self, rol_id: int) -> Rol | None:
        return self.roles.get(rol_id)

    def rol_por_nombre(self, nombre: str) -> Rol | None:
        return next((r for r in self.roles.values() if _lc(r.nombre) == _lc(nombre)), None)

    def create_rol(
        self, nombre: str, descripcion: str | None, permisos: list[str], es_sistema: bool = False
    ) -> Rol:
        rol = Rol(len(self.roles) + 1, nombre, descripcion, es_sistema, True, tuple(sorted(permisos)))
        self.roles[rol.id] = rol
        return rol

    def update_rol(
        self, rol_id: int, nombre: str, descripcion: str | None, activo: bool, permisos: list[str]
    ) -> Rol:
        rol = replace(
            self.roles[rol_id],
            nombre=nombre,
            descripcion=descripcion,
            activo=activo,
            permisos=tuple(sorted(permisos)),
        )
        self.roles[rol_id] = rol
        return rol

    def _completo(self, persona: Operador) -> Operador:
        rol = self.roles[persona.rol_id]
        return replace(
            persona,
            rol_nombre=rol.nombre,
            rol_es_sistema=rol.es_sistema,
            permisos=rol.permisos if rol.activo else (),
        )

    def list_operadores(self) -> list[Operador]:
        return [self._completo(o) for o in sorted(self.operadores.values(), key=lambda o: o.nombre)]

    def get_operador(self, operador_id: int) -> Operador | None:
        persona = self.operadores.get(operador_id)
        return self._completo(persona) if persona else None

    def operador_por_correo(self, correo: str) -> Operador | None:
        persona = next((o for o in self.operadores.values() if _lc(o.correo) == _lc(correo)), None)
        return self._completo(persona) if persona else None

    def create_operador(self, correo: str, nombre: str, rol_id: int, invitado_por: str | None) -> Operador:
        persona = Operador(len(self.operadores) + 1, correo.lower(), nombre, rol_id, True)
        self.operadores[persona.id] = persona
        return self._completo(persona)

    def update_operador(self, operador_id: int, nombre: str, rol_id: int, activo: bool) -> Operador:
        persona = replace(self.operadores[operador_id], nombre=nombre, rol_id=rol_id, activo=activo)
        self.operadores[operador_id] = persona
        return self._completo(persona)


class FakeDirectorio(DirectorioIdentidad):
    def __init__(self) -> None:
        self.invitados: list[tuple[str, str]] = []

    def invitar(self, correo: str, nombre: str, emisor: str | None) -> None:
        self.invitados.append((correo, nombre))


class FakeReasignacionRepository(ReasignacionRepository):
    def __init__(self) -> None:
        self.rows: dict[int, Reasignacion] = {}

    def list_all(self, estado: EstadoReasignacion | None = None) -> list[Reasignacion]:
        filas = [r for r in self.rows.values() if estado is None or r.estado is estado]
        return sorted(filas, key=lambda r: (r.estado is not EstadoReasignacion.PENDIENTE, -r.id))

    def get(self, reasignacion_id: int) -> Reasignacion | None:
        return self.rows.get(reasignacion_id)

    def pendiente_de_activo(self, activo_id: int) -> Reasignacion | None:
        return next(
            (
                r
                for r in self.rows.values()
                if r.activo_id == activo_id and r.estado is EstadoReasignacion.PENDIENTE
            ),
            None,
        )

    def create(
        self, activo_id: int, usuario_origen: int, usuario_destino: int, motivo: str, solicitado_por: int
    ) -> Reasignacion:
        if self.pendiente_de_activo(activo_id):
            raise ConflictError("El registro ya existe.")
        solicitud = Reasignacion(
            len(self.rows) + 1,
            activo_id,
            usuario_origen,
            usuario_destino,
            motivo,
            EstadoReasignacion.PENDIENTE,
            solicitado_por,
            datetime.now(UTC),
        )
        self.rows[solicitud.id] = solicitud
        return solicitud

    def resolver(
        self, reasignacion_id: int, estado: EstadoReasignacion, resuelto_por: int, comentario: str | None
    ) -> Reasignacion:
        solicitud = replace(
            self.rows[reasignacion_id],
            estado=estado,
            resuelto_por=resuelto_por,
            resuelto_en=datetime.now(UTC),
            comentario=comentario,
        )
        self.rows[reasignacion_id] = solicitud
        return solicitud


class FakeAppUnitOfWork(FakeUnitOfWork):
    def __init__(self) -> None:
        super().__init__()
        self.catalogos = FakeCatalogoRepository()
        self.usuarios = FakeUsuarioRepository()
        self.activos = FakeActivoRepository(self.usuarios, self.catalogos)
        self.sync = FakeSyncGoogleRepository()
        self.seguridad = FakeSeguridadRepository()
        self.reasignaciones = FakeReasignacionRepository()
        self.app_users = FakeAppUserRepository()
        self.principals: list = []

    @contextmanager
    def savepoint(self) -> Iterator[None]:
        yield

    def factory(self, principal=None) -> FakeAppUnitOfWork:
        self.principals.append(principal)
        return self
