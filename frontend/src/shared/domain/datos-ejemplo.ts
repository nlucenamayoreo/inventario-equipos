// Datos de ejemplo del prototipo (prototipo/Main.dc.html, método seed) para las pruebas del modelo.
import type {
  Caracteristica,
  Marca,
  Modelo,
  Movimiento,
  Operador,
  Activo,
  Articulo,
  Cargo,
  Departamento,
  EstadoActivo,
  NivelDotacion,
  Silo,
  SyncGoogleEstado,
  TipoEquipo,
  Usuario,
  Vacacion,
} from '../api/types';

export interface DatosEjemplo {
  silos: Silo[];
  departamentos: Departamento[];
  tipos: TipoEquipo[];
  articulos: Articulo[];
  cargos: Cargo[];
  usuarios: Omit<Usuario, 'vacacion'>[];
  vacaciones: Vacacion[];
  activos: Activo[];
  movimientos: Omit<Movimiento, 'usuarioAnteriorNombre' | 'usuarioNuevoNombre'>[];
  marcas: Marca[];
  modelos: Modelo[];
  caracteristicas: Caracteristica[];
  operadores: Operador[];
  sync: SyncGoogleEstado;
  seq: Record<string, number>;
}

const SISTEMA = 'carga_inicial@sistema';

export function crearSeed(): DatosEjemplo {
  const silos: Silo[] = ['Comercial', 'Operaciones', 'Corporativo'].map((nombre, i) => ({
    id: i + 1,
    nombre,
    activo: true,
  }));
  const departamentos: Departamento[] = (
    [
      ['Ventas', 1],
      ['Mercadeo', 1],
      ['Almacén', 2],
      ['Compras', 2],
      ['Logística', 2],
      ['Finanzas', 3],
      ['Tecnología', 3],
      ['Talento Humano', 3],
    ] as const
  ).map(([nombre, siloId], i) => ({ id: i + 1, nombre, siloId, activo: true }));
  const tipos: TipoEquipo[] = [
    'Laptop',
    'Monitor',
    'Teclado',
    'Mouse',
    'Headset',
    'Base laptop',
  ].map((nombre, i) => ({ id: i + 1, nombre, activo: true, maxPorUsuario: i === 0 ? 2 : 1 }));

  const arts: [number, string, string, string | null, number | null, string][] = [
    [1, 'Dell', 'Latitude 5440', 'i5, 16 GB, 512 GB SSD', 48, 'LT'],
    [2, 'HP', 'P24 G5', '24 pulgadas', 60, 'MN'],
    [3, 'Logitech', 'K120', 'USB', 36, 'TC'],
    [4, 'Logitech', 'M90', 'USB', 36, 'MS'],
    [5, 'Jabra', 'Evolve2 30', 'USB-A', 36, 'HS'],
    [6, 'Genérica', 'Ajustable', null, 48, 'BL'],
    [1, 'Dell', 'Precision 3581', 'Estación de trabajo, i7, 32 GB', 48, 'WS'],
  ];
  const articulos: Articulo[] = arts.map(
    ([tipoId, marca, modelo, especificaciones, vidaUtilMeses], i) => ({
      id: i + 1,
      codigo: `ART-${String(i + 1).padStart(3, '0')}`,
      tipoId,
      marca,
      modelo,
      especificaciones,
      vidaUtilMeses,
      activo: true,
      modeloId: null,
      caracteristicas: [],
    }),
  );
  const prefijo = new Map(articulos.map((a, i) => [a.id, arts[i][5]]));
  const artPorDefecto: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

  // O = obligatorio, P = permitido (opcional), N = no permitido — en el orden de los tipos
  const perfiles: [string, string][] = [
    ['Ejecutivo de ventas', 'ONNOON'],
    ['Analista de mercadeo', 'OOOOPO'],
    ['Jefe de almacén', 'OOOONP'],
    ['Auxiliar de almacén', 'NOOONN'],
    ['Comprador', 'OOOOPO'],
    ['Coordinador de logística', 'OPPOOP'],
    ['Analista contable', 'OOOONO'],
    ['Tesorero', 'OOOONO'],
    ['Analista de soporte', 'OOOOOO'],
    ['Desarrollador', 'OOOOOO'],
    ['Analista de nómina', 'OOOOPP'],
  ];
  const niv: Record<string, NivelDotacion> = {
    O: 'obligatorio',
    P: 'permitido',
    N: 'no_permitido',
  };
  const cargos: Cargo[] = perfiles.map(([nombre, p], i) => ({
    id: i + 1,
    nombre,
    activo: true,
    dotacion: tipos.map((t, j) => ({
      tipoId: t.id,
      nivel: niv[p[j]],
      articuloRestringidoId: nombre === 'Desarrollador' && t.id === 1 ? 7 : null,
    })),
  }));
  const cargoPorNombre = new Map(cargos.map((c) => [c.nombre, c]));

  // [cargo, departamentoId]
  const personas: [string, number][] = [
    ['Ejecutivo de ventas', 1],
    ['Ejecutivo de ventas', 1],
    ['Analista de mercadeo', 2],
    ['Jefe de almacén', 3],
    ['Auxiliar de almacén', 3],
    ['Comprador', 4],
    ['Coordinador de logística', 5],
    ['Analista contable', 6],
    ['Tesorero', 6],
    ['Analista de soporte', 7],
    ['Desarrollador', 7],
    ['Analista de nómina', 8],
    ['Ejecutivo de ventas', 1],
  ];
  const usuarios: DatosEjemplo['usuarios'] = personas.map(([cargo, departamentoId], i) => {
    const n = String(i + 1).padStart(3, '0');
    return {
      id: i + 1,
      codigo: `U-${n}`,
      nombre: `Usuario Ejemplo ${String(i + 1).padStart(2, '0')}`,
      correo: `usuario${n}@empresa.com`,
      cargoId: cargoPorNombre.get(cargo)!.id,
      departamentoId,
      estado: 'activo',
      pendienteClasificar: false,
      fuenteDesactivacion: null,
      desactivadoEn: null,
    };
  });

  const activos: Activo[] = [];
  const movimientos: DatosEjemplo['movimientos'] = [];
  let k = 0;
  const ahora = new Date().toISOString();
  const mk = (articuloId: number, usuarioId: number | null, estado: EstadoActivo) => {
    k++;
    const fecha = usuarioId ? `2026-0${1 + (k % 9)}-1${k % 9}` : null;
    activos.push({
      id: k,
      articuloId,
      serial: `${prefijo.get(articuloId)}-${(46000 + k * 137).toString(36).toUpperCase()}`,
      estado,
      usuarioId,
      prestadoA: null,
      fechaAsignacion: fecha,
      custodioId: usuarioId ? null : 1,
    });
    movimientos.push({
      id: movimientos.length + 1,
      activoId: k,
      estadoAnterior: null,
      estadoNuevo: estado,
      usuarioAnterior: null,
      usuarioNuevo: usuarioId,
      custodioAnterior: null,
      custodioNuevo: usuarioId ? null : 1,
      custodioAnteriorNombre: null,
      custodioNuevoNombre: null,
      motivo: 'alta',
      realizadoPor: SISTEMA,
      realizadoEn: fecha ? `${fecha}T12:00:00.000Z` : ahora,
    });
  };

  usuarios.slice(0, 12).forEach((u, i) => {
    const c = cargos.find((x) => x.id === u.cargoId)!;
    tipos.forEach((t, j) => {
      const d = c.dotacion.find((x) => x.tipoId === t.id)!;
      if (d.nivel === 'no_permitido') return;
      const dar =
        d.nivel === 'obligatorio'
          ? !((i + j * 2) % 6 === 0 || (i * j) % 7 === 3)
          : (i + j) % 2 === 0;
      if (dar) mk(d.articuloRestringidoId ?? artPorDefecto[t.id], u.id, 'asignado');
    });
  });
  [1, 1, 7, 2, 2, 2, 5, 4, 6, 3].forEach((a) => mk(a, null, 'disponible'));
  mk(1, null, 'en_reparacion');
  mk(2, null, 'de_baja');

  // Usuario 13: suspendido en Google Workspace, con equipos por recuperar
  mk(1, 13, 'pendiente_recuperacion');
  mk(4, 13, 'pendiente_recuperacion');
  Object.assign(usuarios[12], {
    estado: 'desactivado',
    fuenteDesactivacion: 'google',
    desactivadoEn: '2026-10-06T14:10:00.000Z',
  });

  // Vacaciones de ejemplo
  usuarios[2].estado = 'vacaciones';
  usuarios[10].estado = 'vacaciones';
  const vacaciones: Vacacion[] = [
    {
      id: 1,
      usuarioId: 3,
      desde: '2026-10-05',
      hasta: '2026-10-19',
      accion: 'resguardo',
      suplenteId: null,
      nota: null,
      finalizadaEn: null,
    },
    {
      id: 2,
      usuarioId: 11,
      desde: '2026-10-01',
      hasta: '2026-10-15',
      accion: 'prestamo',
      suplenteId: 10,
      nota: null,
      finalizadaEn: null,
    },
  ];
  for (const a of activos) {
    if (a.usuarioId === 3) a.estado = 'en_resguardo';
    if (a.usuarioId === 11) {
      a.estado = 'prestamo';
      a.prestadoA = 10;
    }
  }

  const hace = (min: number) => new Date(Date.now() - min * 60000).toISOString();
  return {
    silos,
    departamentos,
    tipos,
    articulos,
    cargos,
    usuarios,
    vacaciones,
    activos,
    movimientos,
    marcas: [],
    modelos: [],
    caracteristicas: [],
    operadores: [
      {
        id: 1,
        correo: 'admin.ti@mayoreo.biz',
        nombre: 'Administrador TI',
        rolId: 1,
        rolNombre: 'Superadministrador',
        activo: true,
        creadoEn: null,
      },
    ],
    sync: {
      ultimaExitosa: hace(18),
      ultimaCorrida: {
        iniciadoEn: hace(18),
        finalizadoEn: hace(17),
        exitoso: true,
        leidos: 13,
        desactivados: 0,
        reactivados: 0,
        creados: 0,
      },
    },
    seq: {
      silos: silos.length,
      departamentos: departamentos.length,
      tipos: tipos.length,
      articulos: articulos.length,
      cargos: cargos.length,
      usuarios: usuarios.length,
      vacaciones: vacaciones.length,
      activos: activos.length,
      movimientos: movimientos.length,
    },
  };
}
