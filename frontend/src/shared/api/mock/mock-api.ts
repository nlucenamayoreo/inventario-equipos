// Simulador del backend en el navegador. Aplica las mismas reglas que debe aplicar la API
// (docs/ESPECIFICACION.md y docs/API.md) para poder usar y validar la interfaz sin servidor.
import { cargoPermite, hoyISO, tieneTitular } from '../../domain/reglas';
import { ApiError, DEFAULT_ERROR_MESSAGES } from '../api-error';
import type { ApiClient } from '../client';
import type { Activo, EstadoActivo, Id, Rol, Usuario } from '../types';
import { crearSeed, type MockDb } from './seed';

const KEY_DB = 'inventario-ti-mock-v1';
const KEY_ROL = 'inventario-ti-mock-rol';

const clone = <T>(x: T): T => structuredClone(x);
const lc = (s: string) => s.trim().toLowerCase();
const vacio = (s: string | null | undefined) => !s || !s.trim();
const textoONull = (s: string | null | undefined) => (vacio(s) ? null : s!.trim());
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const mkErr = (status: number, message: string, code: string) =>
  new ApiError({
    status,
    code,
    title: DEFAULT_ERROR_MESSAGES[status]?.title ?? 'Error',
    message,
    severity: 'warning',
  });
const err400 = (m: string, codigo = 'validacion') => mkErr(400, m, codigo);
const err404 = (m: string) => mkErr(404, m, 'no_encontrado');
const err409 = (m: string, codigo = 'conflicto') => mkErr(409, m, codigo);

interface Almacen {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function almacenSeguro(): Almacen | null {
  try {
    const s = window.localStorage;
    s.getItem(KEY_DB);
    return s;
  } catch {
    return null;
  }
}

export interface MockApi extends ApiClient {
  /** Vuelve a los datos de ejemplo. */
  restablecer(): void;
  /** Rol simulado (en producción lo define el backend según el SSO). */
  cambiarRol(rol: Rol): void;
}

export function createMockApi(
  opts: { almacen?: Almacen | null; latenciaMs?: number } = {},
): MockApi {
  const almacen = opts.almacen === undefined ? almacenSeguro() : opts.almacen;
  const latencia = opts.latenciaMs ?? 120;

  let db: MockDb = cargar();
  let rol: Rol = (almacen?.getItem(KEY_ROL) as Rol) || 'admin_ti';

  function cargar(): MockDb {
    try {
      const raw = almacen?.getItem(KEY_DB);
      if (raw) return JSON.parse(raw) as MockDb;
    } catch {
      /* datos corruptos: se regeneran */
    }
    return crearSeed();
  }
  function guardar() {
    try {
      almacen?.setItem(KEY_DB, JSON.stringify(db));
    } catch {
      /* sin almacenamiento: solo memoria */
    }
  }
  const sig = (tabla: string) => (db.seq[tabla] = (db.seq[tabla] ?? 0) + 1);
  const operador = () => (rol === 'admin_ti' ? 'admin.ti@empresa.com' : 'consulta@empresa.com');

  const esperar = <T>(fn: () => T): Promise<T> =>
    new Promise((resolve, reject) =>
      setTimeout(() => {
        try {
          resolve(clone(fn()));
        } catch (e) {
          reject(e);
        }
      }, latencia),
    );

  /** Ejecuta una mutación: exige rol admin y persiste solo si no hay error. */
  const mutar = <T>(fn: () => T): Promise<T> =>
    esperar(() => {
      if (rol !== 'admin_ti') throw mkErr(403, 'Su rol es de solo consulta.', 'prohibido');
      const respaldo = clone(db);
      try {
        const r = fn();
        guardar();
        return r;
      } catch (e) {
        db = respaldo;
        throw e;
      }
    });

  // ---------- auxiliares ----------
  const usuarioDto = (u: MockDb['usuarios'][number]): Usuario => ({
    ...u,
    vacacion: db.vacaciones.find((v) => v.usuarioId === u.id && !v.finalizadaEn) ?? null,
  });
  const getUsuario = (id: Id) => {
    const u = db.usuarios.find((x) => x.id === id && x.estado !== 'eliminado');
    if (!u) throw err404('El usuario no existe.');
    return u;
  };
  const getActivo = (id: Id) => {
    const a = db.activos.find((x) => x.id === id);
    if (!a) throw err404('El activo no existe.');
    return a;
  };
  const getArticulo = (id: Id) => {
    const a = db.articulos.find((x) => x.id === id);
    if (!a) throw err400('Seleccione un artículo válido.');
    return a;
  };
  const getCargo = (id: Id | null) => db.cargos.find((c) => c.id === id) ?? null;

  /** Cambia estado/titular de un activo y registra el movimiento. */
  function mover(
    a: Activo,
    cambios: Partial<Pick<Activo, 'estado' | 'usuarioId' | 'prestadoA' | 'fechaAsignacion'>>,
    motivo: string,
  ) {
    const antes = { estado: a.estado, usuarioId: a.usuarioId };
    Object.assign(a, cambios);
    if (!tieneTitular(a.estado)) {
      a.usuarioId = null;
      a.fechaAsignacion = null;
    }
    if (a.estado !== 'prestamo') a.prestadoA = null;
    if (antes.estado === a.estado && antes.usuarioId === a.usuarioId) return;
    db.movimientos.push({
      id: sig('movimientos'),
      activoId: a.id,
      estadoAnterior: antes.estado,
      estadoNuevo: a.estado,
      usuarioAnterior: antes.usuarioId,
      usuarioNuevo: a.usuarioId,
      motivo,
      realizadoPor: operador(),
      realizadoEn: new Date().toISOString(),
    });
  }

  function validarUsuario(
    datos: {
      codigo?: string;
      nombre?: string;
      correo?: string | null;
      cargoId?: Id | null;
      departamentoId?: Id | null;
    },
    idActual?: Id,
  ) {
    if (datos.codigo !== undefined) {
      if (vacio(datos.codigo)) throw err400('El código es obligatorio.');
      const otro = db.usuarios.find((u) => u.id !== idActual && lc(u.codigo) === lc(datos.codigo!));
      if (otro)
        throw err409(
          `Ya existe un usuario con el código ${datos.codigo.trim()}${otro.estado === 'eliminado' ? ' (eliminado)' : ''}.`,
          'codigo_duplicado',
        );
    }
    if (datos.nombre !== undefined && vacio(datos.nombre))
      throw err400('El nombre es obligatorio.');
    if (datos.correo !== undefined && !vacio(datos.correo)) {
      if (!CORREO_RE.test(datos.correo!.trim())) throw err400('El correo no es válido.');
      if (
        db.usuarios.some((u) => u.id !== idActual && u.correo && lc(u.correo) === lc(datos.correo!))
      )
        throw err409(`El correo ${datos.correo!.trim()} ya está registrado.`, 'correo_duplicado');
    }
    if (datos.cargoId !== undefined && !getCargo(datos.cargoId))
      throw err400('Seleccione un cargo válido.');
    if (
      datos.departamentoId !== undefined &&
      !db.departamentos.some((d) => d.id === datos.departamentoId)
    )
      throw err400('Seleccione un departamento válido.');
  }

  /** Efectos comunes al sacar a un usuario de servicio (baja o desactivación). */
  function retirarDeServicio(id: Id, estadoEquipos: EstadoActivo, motivo: string) {
    let liberados = 0,
      prestamosDevueltosATi = 0,
      vacacionesAjustadas = 0;
    for (const a of db.activos) {
      if (a.usuarioId === id && tieneTitular(a.estado)) {
        if (estadoEquipos === 'pendiente_recuperacion' && a.estado === 'pendiente_recuperacion')
          continue;
        mover(
          a,
          { estado: estadoEquipos, ...(estadoEquipos === 'disponible' ? { usuarioId: null } : {}) },
          motivo,
        );
        liberados++;
      } else if (a.prestadoA === id && a.estado === 'prestamo') {
        mover(a, { estado: 'en_resguardo' }, motivo);
        prestamosDevueltosATi++;
      }
    }
    for (const v of db.vacaciones) {
      if (v.usuarioId === id && !v.finalizadaEn) v.finalizadaEn = new Date().toISOString();
      if (v.suplenteId === id && !v.finalizadaEn) {
        v.accion = 'resguardo';
        v.suplenteId = null;
        vacacionesAjustadas++;
      }
    }
    return { liberados, prestamosDevueltosATi, vacacionesAjustadas };
  }

  return {
    restablecer() {
      db = crearSeed();
      guardar();
    },
    cambiarRol(r) {
      rol = r;
      try {
        almacen?.setItem(KEY_ROL, r);
      } catch {
        /* ignore */
      }
    },

    sesion: () =>
      esperar(() => ({
        correo: operador(),
        nombre: rol === 'admin_ti' ? 'Administrador TI (demo)' : 'Usuario de consulta (demo)',
        rol,
      })),
    syncGoogleEstado: () => esperar(() => db.sync),

    // ---------- catálogos ----------
    silos: () => esperar(() => db.silos),
    crearSilo: (nombre) =>
      mutar(() => {
        if (vacio(nombre)) throw err400('Indique el nombre del silo.');
        if (db.silos.some((s) => lc(s.nombre) === lc(nombre)))
          throw err409(`El silo ${nombre.trim()} ya existe.`);
        const s = { id: sig('silos'), nombre: nombre.trim(), activo: true };
        db.silos.push(s);
        return s;
      }),
    departamentos: () => esperar(() => db.departamentos),
    crearDepartamento: (nombre, siloId) =>
      mutar(() => {
        if (vacio(nombre) || !siloId) throw err400('Indique nombre y silo del departamento.');
        if (!db.silos.some((s) => s.id === siloId)) throw err400('Seleccione un silo válido.');
        if (db.departamentos.some((d) => d.siloId === siloId && lc(d.nombre) === lc(nombre)))
          throw err409(`El departamento ${nombre.trim()} ya existe en ese silo.`);
        const d = { id: sig('departamentos'), siloId, nombre: nombre.trim(), activo: true };
        db.departamentos.push(d);
        return d;
      }),
    tiposEquipo: () => esperar(() => db.tipos),
    crearTipoEquipo: (nombre) =>
      mutar(() => {
        if (vacio(nombre)) throw err400('Indique el tipo de equipo.');
        if (db.tipos.some((t) => lc(t.nombre) === lc(nombre)))
          throw err409(`El tipo ${nombre.trim()} ya existe.`);
        // Tipo nuevo: sin fila en cargo_dotacion = no permitido en todos los cargos
        const t = { id: sig('tipos'), nombre: nombre.trim(), activo: true };
        db.tipos.push(t);
        return t;
      }),
    articulos: () => esperar(() => db.articulos),
    crearArticulo: (d) =>
      mutar(() => {
        if (!d.tipoId || vacio(d.marca) || vacio(d.modelo))
          throw err400('Tipo, marca y modelo son obligatorios.');
        if (!db.tipos.some((t) => t.id === d.tipoId)) throw err400('Seleccione un tipo válido.');
        if (d.vidaUtilMeses != null && (!Number.isInteger(d.vidaUtilMeses) || d.vidaUtilMeses < 0))
          throw err400('La vida útil debe ser un número entero de meses.');
        if (
          db.articulos.some(
            (a) =>
              a.tipoId === d.tipoId && lc(a.marca) === lc(d.marca) && lc(a.modelo) === lc(d.modelo),
          )
        )
          throw err409('Ese artículo ya existe en el catálogo.', 'articulo_duplicado');
        const id = sig('articulos');
        const a = {
          id,
          codigo: `ART-${String(id).padStart(3, '0')}`,
          tipoId: d.tipoId,
          marca: d.marca.trim(),
          modelo: d.modelo.trim(),
          especificaciones: textoONull(d.especificaciones),
          vidaUtilMeses: d.vidaUtilMeses ?? null,
          activo: true,
        };
        db.articulos.push(a);
        return a;
      }),
    cargos: () => esperar(() => db.cargos),
    crearCargo: (nombre) =>
      mutar(() => {
        if (vacio(nombre)) throw err400('Indique el nombre del cargo.');
        if (db.cargos.some((c) => lc(c.nombre) === lc(nombre)))
          throw err409(`El cargo ${nombre.trim()} ya existe.`);
        // Cargo nuevo: todos los tipos nacen "permitido"
        const c = {
          id: sig('cargos'),
          nombre: nombre.trim(),
          activo: true,
          dotacion: db.tipos.map((t) => ({
            tipoId: t.id,
            nivel: 'permitido' as const,
            articuloRestringidoId: null,
          })),
        };
        db.cargos.push(c);
        return c;
      }),
    actualizarDotacion: (cargoId, tipoId, nivel, articuloRestringidoId) =>
      mutar(() => {
        const c = getCargo(cargoId);
        if (!c) throw err404('El cargo no existe.');
        if (!db.tipos.some((t) => t.id === tipoId)) throw err400('Tipo de equipo no válido.');
        if (articuloRestringidoId != null) {
          const a = getArticulo(articuloRestringidoId);
          if (a.tipoId !== tipoId) throw err400('El artículo restringido debe ser del mismo tipo.');
        }
        const restr = nivel === 'no_permitido' ? null : articuloRestringidoId;
        const fila = c.dotacion.find((d) => d.tipoId === tipoId);
        if (fila) Object.assign(fila, { nivel, articuloRestringidoId: restr });
        else c.dotacion.push({ tipoId, nivel, articuloRestringidoId: restr });
        return c;
      }),

    // ---------- usuarios ----------
    usuarios: () =>
      esperar(() => db.usuarios.filter((u) => u.estado !== 'eliminado').map(usuarioDto)),
    crearUsuario: (d) =>
      mutar(() => {
        if (vacio(d.codigo) || vacio(d.nombre) || !d.cargoId || !d.departamentoId)
          throw err400('Código, nombre, cargo y departamento son obligatorios.');
        validarUsuario(d);
        const u = {
          id: sig('usuarios'),
          codigo: d.codigo.trim(),
          nombre: d.nombre.trim(),
          correo: textoONull(d.correo)?.toLowerCase() ?? null,
          cargoId: d.cargoId,
          departamentoId: d.departamentoId,
          estado: 'activo' as const,
          pendienteClasificar: false,
          fuenteDesactivacion: null,
          desactivadoEn: null,
        };
        db.usuarios.push(u);
        return usuarioDto(u);
      }),
    editarUsuario: (id, d) =>
      mutar(() => {
        const u = getUsuario(id);
        validarUsuario(d, id);
        if (d.codigo !== undefined) u.codigo = d.codigo.trim();
        if (d.nombre !== undefined) u.nombre = d.nombre.trim();
        if (d.correo !== undefined) u.correo = textoONull(d.correo)?.toLowerCase() ?? null;
        if (d.cargoId !== undefined) u.cargoId = d.cargoId;
        if (d.departamentoId !== undefined) u.departamentoId = d.departamentoId;
        if (u.cargoId && u.departamentoId) u.pendienteClasificar = false;
        // Si el nuevo cargo no permite algún equipo, queda "fuera de perfil" (no se libera automáticamente)
        return usuarioDto(u);
      }),
    eliminarUsuario: (id) =>
      mutar(() => {
        const u = getUsuario(id);
        const r = retirarDeServicio(id, 'disponible', 'baja_usuario');
        u.estado = 'eliminado';
        return r;
      }),
    registrarVacaciones: (id, d) =>
      mutar(() => {
        const u = getUsuario(id);
        if (u.estado !== 'activo')
          throw err409('Solo se pueden registrar vacaciones a usuarios activos.');
        if (!d.desde || !d.hasta || !d.accion)
          throw err400('Indique fechas y qué pasa con los equipos.');
        if (d.hasta < d.desde) throw err400('La fecha «hasta» no puede ser anterior a «desde».');
        let suplenteId: Id | null = null;
        if (d.accion === 'prestamo') {
          if (!d.suplenteId) throw err400('Seleccione el suplente que recibe los equipos.');
          if (d.suplenteId === id) throw err400('El suplente debe ser otra persona.');
          const s = getUsuario(d.suplenteId);
          if (s.estado !== 'activo') throw err409('El suplente debe estar activo.');
          suplenteId = s.id;
        }
        db.vacaciones.push({
          id: sig('vacaciones'),
          usuarioId: id,
          desde: d.desde,
          hasta: d.hasta,
          accion: d.accion,
          suplenteId,
          nota: textoONull(d.nota),
          finalizadaEn: null,
        });
        u.estado = 'vacaciones';
        for (const a of db.activos) {
          if (a.usuarioId !== id || a.estado !== 'asignado') continue;
          if (d.accion === 'resguardo') mover(a, { estado: 'en_resguardo' }, 'vacaciones');
          if (d.accion === 'prestamo')
            mover(a, { estado: 'prestamo', prestadoA: suplenteId }, 'vacaciones');
        }
        return usuarioDto(u);
      }),
    finalizarVacaciones: (id) =>
      mutar(() => {
        const u = getUsuario(id);
        if (u.estado !== 'vacaciones') throw err409('El usuario no está de vacaciones.');
        u.estado = 'activo';
        for (const v of db.vacaciones)
          if (v.usuarioId === id && !v.finalizadaEn) v.finalizadaEn = new Date().toISOString();
        for (const a of db.activos) {
          if (a.usuarioId === id && (a.estado === 'en_resguardo' || a.estado === 'prestamo'))
            mover(a, { estado: 'asignado' }, 'fin_vacaciones');
        }
        return usuarioDto(u);
      }),
    desactivarUsuario: (id) =>
      mutar(() => {
        const u = getUsuario(id);
        if (u.estado === 'desactivado') throw err409('El usuario ya está desactivado.');
        retirarDeServicio(id, 'pendiente_recuperacion', 'desactivacion');
        Object.assign(u, {
          estado: 'desactivado',
          fuenteDesactivacion: 'manual',
          desactivadoEn: new Date().toISOString(),
        });
        return usuarioDto(u);
      }),
    reactivarUsuario: (id) =>
      mutar(() => {
        const u = getUsuario(id);
        if (u.estado !== 'desactivado') throw err409('El usuario no está desactivado.');
        // Los equipos siguen pendientes de recuperación hasta que TI decida
        Object.assign(u, { estado: 'activo', fuenteDesactivacion: null, desactivadoEn: null });
        return usuarioDto(u);
      }),

    // ---------- activos ----------
    activos: () => esperar(() => db.activos),
    crearActivo: (d) =>
      mutar(() => {
        if (!d.articuloId || vacio(d.serial)) throw err400('Artículo y serial son obligatorios.');
        const art = getArticulo(d.articuloId);
        if (db.activos.some((a) => lc(a.serial) === lc(d.serial)))
          throw err409(`El serial ${d.serial.trim()} ya está registrado.`, 'serial_duplicado');
        if (!['disponible', 'en_reparacion', 'de_baja'].includes(d.estado))
          throw err400('Estado inicial no válido.');
        let usuarioId: Id | null = null;
        if (d.usuarioId) {
          const u = getUsuario(d.usuarioId);
          if (u.estado === 'desactivado')
            throw err409(`${u.nombre} está desactivado; no puede recibir equipos.`);
          if (!cargoPermite(getCargo(u.cargoId), art))
            throw err409(
              `El cargo de ${u.nombre} no permite este artículo. Regístrelo sin asignar o ajuste el perfil del cargo.`,
              'no_permitido',
            );
          usuarioId = u.id;
        }
        const a: Activo = {
          id: sig('activos'),
          articuloId: art.id,
          serial: d.serial.trim(),
          estado: usuarioId ? 'asignado' : d.estado,
          usuarioId,
          prestadoA: null,
          fechaAsignacion: usuarioId ? hoyISO() : null,
        };
        db.activos.push(a);
        db.movimientos.push({
          id: sig('movimientos'),
          activoId: a.id,
          estadoAnterior: null,
          estadoNuevo: a.estado,
          usuarioAnterior: null,
          usuarioNuevo: usuarioId,
          motivo: 'alta',
          realizadoPor: operador(),
          realizadoEn: new Date().toISOString(),
        });
        return a;
      }),
    asignarActivo: (id, usuarioId) =>
      mutar(() => {
        const a = getActivo(id);
        if (a.estado !== 'disponible') throw err409('Solo se pueden asignar equipos disponibles.');
        const u = getUsuario(usuarioId);
        if (u.estado === 'desactivado')
          throw err409(`${u.nombre} está desactivado; no puede recibir equipos.`);
        if (!cargoPermite(getCargo(u.cargoId), getArticulo(a.articuloId)))
          throw err409('El cargo no permite este equipo.', 'no_permitido');
        mover(a, { estado: 'asignado', usuarioId: u.id, fechaAsignacion: hoyISO() }, 'asignacion');
        return a;
      }),
    liberarActivo: (id) =>
      mutar(() => {
        const a = getActivo(id);
        if (!a.usuarioId) throw err409('El equipo no tiene titular.');
        mover(
          a,
          { estado: 'disponible', usuarioId: null },
          a.estado === 'pendiente_recuperacion' ? 'recuperacion' : 'liberacion',
        );
        return a;
      }),
    cambiarEstadoActivo: (id, estado) =>
      mutar(() => {
        const a = getActivo(id);
        if (a.usuarioId) throw err409('Libere el equipo antes de cambiar su estado.');
        if (!['disponible', 'en_reparacion', 'de_baja'].includes(estado))
          throw err400('Estado no válido.');
        mover(a, { estado }, 'cambio_estado');
        return a;
      }),
    movimientos: (activoId) =>
      esperar(() => {
        getActivo(activoId);
        const nombre = (id: Id | null) =>
          id == null ? null : (db.usuarios.find((u) => u.id === id)?.nombre ?? null);
        return db.movimientos
          .filter((m) => m.activoId === activoId)
          .sort((x, y) => y.realizadoEn.localeCompare(x.realizadoEn) || y.id - x.id)
          .map((m) => ({
            ...m,
            usuarioAnteriorNombre: nombre(m.usuarioAnterior),
            usuarioNuevoNombre: nombre(m.usuarioNuevo),
          }));
      }),
  };
}
