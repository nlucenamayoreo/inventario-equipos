import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../api-error';
import { createMockApi, type MockApi } from './mock-api';

// Criterios de aceptación de CLAUDE.md verificados contra el simulador.
// El backend debe pasar pruebas equivalentes.

let api: MockApi;
beforeEach(() => {
  api = createMockApi({ almacen: null, latenciaMs: 0 });
});

const falla = async (p: Promise<unknown>, status: number, texto?: RegExp) => {
  const e = await p.then(
    () => null,
    (x) => x,
  );
  expect(e).toBeInstanceOf(ApiError);
  expect((e as ApiError).status).toBe(status);
  if (texto) expect((e as ApiError).message).toMatch(texto);
};

describe('activos', () => {
  it('rechaza seriales duplicados sin distinguir mayúsculas', async () => {
    const [a] = await api.activos();
    await falla(
      api.crearActivo({
        articuloId: 1,
        serial: a.serial.toLowerCase(),
        estado: 'disponible',
        usuarioId: null,
      }),
      409,
      /ya está registrado/,
    );
  });

  it('no asigna un equipo que el cargo no permite', async () => {
    // Usuario 5 = Auxiliar de almacén: Laptop no permitida
    const laptop = (await api.activos()).find(
      (a) => a.estado === 'disponible' && a.articuloId === 1,
    )!;
    await falla(api.asignarActivo(laptop.id, 5), 409, /no permite/);
  });

  it('respeta el artículo restringido del cargo', async () => {
    // Usuario 11 = Desarrollador: solo laptop Precision (ART-007); finaliza vacaciones primero
    await api.finalizarVacaciones(11);
    const latitude = (await api.activos()).find(
      (a) => a.estado === 'disponible' && a.articuloId === 1,
    )!;
    await falla(api.asignarActivo(latitude.id, 11), 409);
    const precision = (await api.activos()).find(
      (a) => a.estado === 'disponible' && a.articuloId === 7,
    )!;
    const r = await api.asignarActivo(precision.id, 11);
    expect(r).toMatchObject({ estado: 'asignado', usuarioId: 11 });
  });

  it('registra un movimiento en cada transición', async () => {
    // Usuario 1 = Ejecutivo de ventas: headset obligatorio
    const a = (await api.activos()).find((x) => x.estado === 'disponible' && x.articuloId === 5)!;
    await api.asignarActivo(a.id, 1);
    await api.liberarActivo(a.id);
    await api.cambiarEstadoActivo(a.id, 'en_reparacion');
    const movs = await api.movimientos(a.id);
    expect(movs.map((m) => m.motivo)).toEqual([
      'cambio_estado',
      'liberacion',
      'asignacion',
      'alta',
    ]);
    expect(movs[2]).toMatchObject({
      estadoAnterior: 'disponible',
      estadoNuevo: 'asignado',
      usuarioNuevo: 1,
    });
  });

  it('el rol consulta no puede modificar', async () => {
    api.cambiarRol('consulta');
    await falla(api.crearSilo('Nuevo'), 403);
  });
});

describe('vacaciones', () => {
  it('préstamo: los equipos asignados pasan al suplente y vuelven al finalizar', async () => {
    const antes = (await api.activos()).filter((a) => a.usuarioId === 1 && a.estado === 'asignado');
    expect(antes.length).toBeGreaterThan(0);
    await api.registrarVacaciones(1, {
      desde: '2026-11-01',
      hasta: '2026-11-10',
      accion: 'prestamo',
      suplenteId: 2,
      nota: null,
    });
    const durante = (await api.activos()).filter((a) => a.usuarioId === 1);
    expect(durante.every((a) => a.estado === 'prestamo' && a.prestadoA === 2)).toBe(true);
    await api.finalizarVacaciones(1);
    const despues = (await api.activos()).filter((a) => a.usuarioId === 1);
    expect(despues.every((a) => a.estado === 'asignado' && a.prestadoA === null)).toBe(true);
  });

  it('valida fechas y suplente activo', async () => {
    await falla(
      api.registrarVacaciones(1, {
        desde: '2026-11-10',
        hasta: '2026-11-01',
        accion: 'conserva',
        suplenteId: null,
        nota: null,
      }),
      400,
    );
    await falla(
      api.registrarVacaciones(1, {
        desde: '2026-11-01',
        hasta: '2026-11-10',
        accion: 'prestamo',
        suplenteId: 3,
        nota: null,
      }),
      409,
      /activo/,
    );
  });
});

describe('baja y desactivación', () => {
  it('eliminar: libera sus equipos, devuelve préstamos a TI y ajusta vacaciones donde era suplente', async () => {
    // Usuario 10 es suplente de las vacaciones del 11
    const r = await api.eliminarUsuario(10);
    expect(r.prestamosDevueltosATi).toBeGreaterThan(0);
    expect(r.vacacionesAjustadas).toBe(1);
    const activos = await api.activos();
    expect(activos.some((a) => a.usuarioId === 10 || a.prestadoA === 10)).toBe(false);
    expect(
      activos.filter((a) => a.usuarioId === 11).every((a) => a.estado === 'en_resguardo'),
    ).toBe(true);
    const u11 = (await api.usuarios()).find((u) => u.id === 11)!;
    expect(u11.vacacion).toMatchObject({ accion: 'resguardo', suplenteId: null });
    expect((await api.usuarios()).some((u) => u.id === 10)).toBe(false);
  });

  it('desactivar: equipos pasan a pendiente de recuperación', async () => {
    await api.desactivarUsuario(1);
    const activos = (await api.activos()).filter((a) => a.usuarioId === 1);
    expect(activos.length).toBeGreaterThan(0);
    expect(activos.every((a) => a.estado === 'pendiente_recuperacion')).toBe(true);
  });
});

describe('catálogos', () => {
  it('cargo nuevo nace con todo permitido; tipo nuevo queda no permitido', async () => {
    const c = await api.crearCargo('Pasante');
    expect(c.dotacion.every((d) => d.nivel === 'permitido')).toBe(true);
    const t = await api.crearTipoEquipo('Tablet');
    const cargos = await api.cargos();
    expect(
      cargos.every((x) => !x.dotacion.some((d) => d.tipoId === t.id && d.nivel !== 'no_permitido')),
    ).toBe(true);
  });

  it('no repite tipo + marca + modelo', async () => {
    await falla(
      api.crearArticulo({
        tipoId: 1,
        marca: 'dell',
        modelo: 'LATITUDE 5440',
        especificaciones: null,
        vidaUtilMeses: null,
      }),
      409,
    );
  });
});
