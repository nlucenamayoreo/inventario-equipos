// Machotes de Excel para las cargas masivas: se generan en el navegador con los catálogos vigentes
// y se leen de vuelta para enviar las filas en JSON al backend. `exceljs` se carga bajo demanda
// (import dinámico) para no engordar el bundle principal.
import type { Workbook, Worksheet } from 'exceljs';
import type { FilaMachote } from '../../../shared/api/types';
import type { Modelo } from '../../../shared/domain/modelo';

export type TipoCarga = 'usuarios' | 'activos';

/** Columna del machote: `clave` es el nombre que espera el backend; `encabezado`, el que ve el usuario. */
export interface Columna {
  clave: string;
  encabezado: string;
  obligatoria: boolean;
  ancho: number;
  descripcion: string;
  ejemplo: string;
  /** Lista de la hoja «Listas» que alimenta el desplegable de la columna. */
  lista?: keyof ListasMachote;
  /** true: solo se aceptan valores de la lista; false: la lista sugiere pero se puede escribir otro. */
  estricta?: boolean;
  /** Columna con formato texto (evita que Excel convierta códigos o seriales en números). */
  texto?: boolean;
}

export const MAX_FILAS = 1000;
/** Última fila de datos con desplegables (encabezado en la fila 1). */
const ULTIMA_FILA = MAX_FILAS + 1;

export const ESTADOS_CARGA = ['Disponible', 'En reparación', 'De baja'];

export const COLUMNAS: Record<TipoCarga, Columna[]> = {
  usuarios: [
    { clave: 'codigo', encabezado: 'Código', obligatoria: true, ancho: 14, texto: true, descripcion: 'Código único del colaborador.', ejemplo: 'E-1025' },
    { clave: 'nombre', encabezado: 'Nombre', obligatoria: true, ancho: 32, descripcion: 'Nombre completo.', ejemplo: 'María Pérez' },
    { clave: 'correo', encabezado: 'Correo', obligatoria: false, ancho: 30, descripcion: 'Correo corporativo (se usa para enlazar con Google Workspace).', ejemplo: 'mperez@mayoreo.biz' },
    { clave: 'cargo', encabezado: 'Cargo', obligatoria: true, ancho: 26, lista: 'cargos', estricta: true, descripcion: 'Cargo tal como está en Catálogos; define la dotación de equipos.', ejemplo: 'Analista' },
    { clave: 'departamento', encabezado: 'Departamento', obligatoria: true, ancho: 26, lista: 'departamentos', estricta: true, descripcion: 'Departamento tal como está en Catálogos.', ejemplo: 'Contabilidad' },
    { clave: 'silo', encabezado: 'Silo', obligatoria: false, ancho: 18, lista: 'silos', estricta: true, descripcion: 'Obligatorio solo si el nombre del departamento se repite en varios silos.', ejemplo: 'Mayoreo' },
  ],
  activos: [
    { clave: 'tipo', encabezado: 'Tipo', obligatoria: true, ancho: 16, lista: 'tipos', estricta: true, descripcion: 'Tipo de equipo del catálogo.', ejemplo: 'Laptop' },
    { clave: 'marca', encabezado: 'Marca', obligatoria: true, ancho: 16, lista: 'marcas', estricta: false, descripcion: 'Marca existente o una nueva (se crea si tiene permiso para gestionar artículos).', ejemplo: 'Dell' },
    { clave: 'modelo', encabezado: 'Modelo', obligatoria: true, ancho: 22, lista: 'modelos', estricta: false, descripcion: 'Modelo existente o uno nuevo (se crea si tiene permiso para gestionar artículos).', ejemplo: 'Latitude 5440' },
    { clave: 'especificaciones', encabezado: 'Especificaciones', obligatoria: false, ancho: 28, descripcion: 'Texto libre con detalles del artículo.', ejemplo: 'Intel Core i5, 14"' },
    { clave: 'caracteristicas', encabezado: 'Características', obligatoria: false, ancho: 28, descripcion: 'Pares «Nombre: valor» separados por punto y coma.', ejemplo: 'RAM: 16 GB; Disco: 512 GB' },
    { clave: 'serial', encabezado: 'Serial', obligatoria: true, ancho: 20, texto: true, descripcion: 'Número de serie; único (sin distinguir mayúsculas).', ejemplo: 'ABC123XYZ' },
    { clave: 'estado', encabezado: 'Estado', obligatoria: false, ancho: 16, lista: 'estados', estricta: true, descripcion: 'Disponible, En reparación o De baja. Vacío = Disponible.', ejemplo: 'Disponible' },
    { clave: 'codigo_usuario', encabezado: 'Código usuario', obligatoria: false, ancho: 16, texto: true, lista: 'codigosUsuario', estricta: false, descripcion: 'Código del usuario al que se asigna el equipo. Vacío = queda sin asignar.', ejemplo: 'E-1025' },
    { clave: 'correo_custodio', encabezado: 'Correo custodio', obligatoria: false, ancho: 30, lista: 'correosCustodio', estricta: true, descripcion: 'Persona con acceso responsable del resguardo si no se asigna. Vacío = quien hace la carga.', ejemplo: 'soporte@mayoreo.biz' },
  ],
};

export const HOJA: Record<TipoCarga, string> = { usuarios: 'Usuarios', activos: 'Activos' };
export const ARCHIVO: Record<TipoCarga, string> = {
  usuarios: 'machote-usuarios.xlsx',
  activos: 'machote-activos.xlsx',
};

/** Valores de los desplegables del machote, tomados de los catálogos vigentes. */
export interface ListasMachote {
  cargos: string[];
  departamentos: string[];
  silos: string[];
  tipos: string[];
  marcas: string[];
  modelos: string[];
  estados: string[];
  codigosUsuario: string[];
  correosCustodio: string[];
}

const unicos = (xs: (string | null | undefined)[]) =>
  [...new Set(xs.map((x) => (x ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );

export function listasDesdeModelo(m: Modelo): ListasMachote {
  const act = <T extends { activo: boolean; nombre: string }>(xs: T[]) =>
    unicos(xs.filter((x) => x.activo).map((x) => x.nombre));
  return {
    cargos: act(m.cargos),
    departamentos: act(m.departamentos),
    silos: act(m.silos),
    tipos: act(m.tipos),
    marcas: act(m.marcas),
    modelos: act(m.modelos),
    estados: ESTADOS_CARGA,
    codigosUsuario: unicos(
      m.usuarios.filter((u) => u.estado === 'activo' || u.estado === 'vacaciones').map((u) => u.codigo),
    ),
    correosCustodio: unicos(m.operadores.filter((o) => o.activo).map((o) => o.correo)),
  };
}

// ---------- Lectura: encabezados y celdas ----------

/** Minúsculas, sin acentos y sin espacios ni signos: «Código usuario» y «codigo_usuario» coinciden. */
export function normalizarEncabezado(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Convierte cualquier valor de celda de exceljs (texto enriquecido, hipervínculo, fórmula…) a texto. */
export function celdaATexto(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText))
      return o.richText.map((r) => celdaATexto((r as { text?: unknown }).text)).join('').trim();
    if ('result' in o) return celdaATexto(o.result);
    if ('text' in o) {
      const t = celdaATexto(o.text);
      if (t) return t;
    }
    if (typeof o.hyperlink === 'string') return o.hyperlink.replace(/^mailto:/i, '').trim();
    if ('error' in o) return '';
  }
  return '';
}

export interface FilaExcel {
  /** Número de fila en Excel (el encabezado es la 1). */
  numero: number;
  /** Valores por número de columna (índice 1 = columna A), como `row.values` de exceljs. */
  valores: unknown[];
}

export interface FilasLeidas {
  filas: FilaMachote[];
  /** Número de fila de Excel de cada elemento de `filas` (las vacías se omiten). */
  numeros: number[];
  /** Encabezados obligatorios que no se encontraron. */
  faltantes: string[];
}

/** Asocia cada columna del archivo con su clave del backend y arma las filas no vacías. */
export function mapearFilas(encabezados: unknown[], filas: FilaExcel[], columnas: Columna[]): FilasLeidas {
  const porNombre = new Map<string, Columna>();
  for (const c of columnas) {
    porNombre.set(normalizarEncabezado(c.encabezado), c);
    porNombre.set(normalizarEncabezado(c.clave), c);
  }
  const indice = new Map<string, number>();
  encabezados.forEach((h, i) => {
    const c = porNombre.get(normalizarEncabezado(celdaATexto(h)));
    if (c && !indice.has(c.clave)) indice.set(c.clave, i);
  });
  const faltantes = columnas
    .filter((c) => c.obligatoria && !indice.has(c.clave))
    .map((c) => c.encabezado);

  const salida: FilasLeidas = { filas: [], numeros: [], faltantes };
  for (const f of filas) {
    const fila: FilaMachote = {};
    let vacia = true;
    for (const [clave, i] of indice) {
      const t = celdaATexto(f.valores[i]);
      fila[clave] = t || null;
      if (t) vacia = false;
    }
    if (vacia) continue;
    salida.filas.push(fila);
    salida.numeros.push(f.numero);
  }
  return salida;
}

/** El backend numera las filas desde 2 en el orden enviado; esto devuelve la fila real del Excel. */
export const filaReal = (numeros: number[], filaBackend: number) =>
  numeros[filaBackend - 2] ?? filaBackend;

// ---------- exceljs ----------

type ExcelJS = typeof import('exceljs');

async function cargarExcelJS(): Promise<ExcelJS> {
  const mod = (await import('exceljs')) as ExcelJS & { default?: ExcelJS };
  return mod.default ?? mod;
}

const AZUL = 'FF0093D0';
const BORDE = 'FFD4D9DF';

function encabezado(ws: Worksheet, titulos: string[]) {
  const r = ws.getRow(1);
  titulos.forEach((t, i) => {
    const c = r.getCell(i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI', size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
    c.border = { bottom: { style: 'thin', color: { argb: BORDE } } };
    c.alignment = { vertical: 'middle' };
  });
  r.height = 20;
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];
}

const letra = (n: number) => {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

/** Agrega la validación a un rango completo (exceljs la escribe como un solo `sqref`). */
function validarRango(ws: Worksheet, rango: string, v: import('exceljs').DataValidation) {
  (ws as unknown as { dataValidations: { add(a: string, v: unknown): void } }).dataValidations.add(rango, v);
}

function hojaListas(wb: Workbook, listas: ListasMachote, columnas: Columna[]) {
  const ws = wb.addWorksheet('Listas', { state: 'hidden' });
  const rangos = new Map<string, string>();
  columnas
    .filter((c) => c.lista)
    .forEach((c, i) => {
      const valores = listas[c.lista!];
      const col = letra(i + 1);
      ws.getCell(`${col}1`).value = c.encabezado;
      valores.forEach((v, j) => (ws.getCell(`${col}${j + 2}`).value = v));
      ws.getColumn(i + 1).width = 28;
      if (valores.length) rangos.set(c.clave, `Listas!$${col}$2:$${col}$${valores.length + 1}`);
    });
  return rangos;
}

function hojaInstrucciones(wb: Workbook, tipo: TipoCarga, columnas: Columna[]) {
  const ws = wb.addWorksheet('Instrucciones');
  ws.columns = [{ width: 20 }, { width: 14 }, { width: 70 }, { width: 28 }];
  ws.getCell('A1').value = `Machote de carga masiva de ${tipo} — Inventario de Equipos TI`;
  ws.getCell('A1').font = { bold: true, size: 13, name: 'Segoe UI' };
  const notas = [
    `Complete la hoja «${HOJA[tipo]}» a partir de la fila 2, una fila por ${tipo === 'usuarios' ? 'usuario' : 'equipo'}. No cambie los encabezados.`,
    `Máximo ${MAX_FILAS} filas por archivo. Las filas vacías se ignoran.`,
    'Las columnas con desplegable toman los valores de los catálogos vigentes al descargar el machote.',
    'La carga es todo o nada: si alguna fila tiene error, no se aplica ninguna.',
  ];
  notas.forEach((n, i) => (ws.getCell(`A${i + 2}`).value = `• ${n}`));
  const fila0 = notas.length + 3;
  encabezadoEn(ws, fila0, ['Columna', 'Obligatoria', 'Descripción', 'Ejemplo']);
  columnas.forEach((c, i) => {
    const r = ws.getRow(fila0 + 1 + i);
    r.values = [c.encabezado, c.obligatoria ? 'Sí' : 'No', c.descripcion, c.ejemplo];
    r.getCell(3).alignment = { wrapText: true, vertical: 'top' };
  });
}

function encabezadoEn(ws: Worksheet, fila: number, titulos: string[]) {
  const r = ws.getRow(fila);
  r.values = titulos;
  r.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
  });
}

/** Genera el machote (.xlsx) del tipo indicado con los catálogos vigentes. */
export async function generarMachote(tipo: TipoCarga, listas: ListasMachote): Promise<ArrayBuffer> {
  const Excel = await cargarExcelJS();
  const wb = new Excel.Workbook();
  wb.creator = 'Inventario de Equipos TI — Grupo Mayoreo';
  wb.created = new Date();
  const columnas = COLUMNAS[tipo];

  const ws = wb.addWorksheet(HOJA[tipo]);
  ws.columns = columnas.map((c) => ({
    key: c.clave,
    width: c.ancho,
    style: c.texto ? { numFmt: '@' } : {},
  }));
  encabezado(ws, columnas.map((c) => c.encabezado));
  hojaInstrucciones(wb, tipo, columnas);
  const rangos = hojaListas(wb, listas, columnas);

  columnas.forEach((c, i) => {
    const rango = rangos.get(c.clave);
    if (!rango) return;
    const col = letra(i + 1);
    validarRango(ws, `${col}2:${col}${ULTIMA_FILA}`, {
      type: 'list',
      allowBlank: true,
      formulae: [rango],
      showErrorMessage: !!c.estricta,
      errorStyle: 'stop',
      errorTitle: c.encabezado,
      error: `Elija un valor de la lista de ${c.encabezado.toLowerCase()}.`,
    });
  });
  wb.views = [{ activeTab: 0, x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, visibility: 'visible' }];
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export class ErrorMachote extends Error {}

/** Lee un machote lleno y devuelve las filas listas para el backend. Lanza `ErrorMachote` con un texto para el usuario. */
export async function leerMachote(tipo: TipoCarga, datos: ArrayBuffer): Promise<FilasLeidas> {
  const Excel = await cargarExcelJS();
  const wb = new Excel.Workbook();
  try {
    await wb.xlsx.load(datos);
  } catch {
    throw new ErrorMachote('No se pudo leer el archivo. Verifique que sea un Excel (.xlsx) válido.');
  }
  const columnas = COLUMNAS[tipo];
  const buscado = normalizarEncabezado(HOJA[tipo]);
  const ws =
    wb.worksheets.find((w) => normalizarEncabezado(w.name) === buscado) ??
    (wb.worksheets.length === 1 ? wb.worksheets[0] : undefined);
  if (!ws)
    throw new ErrorMachote(
      `El archivo no tiene la hoja «${HOJA[tipo]}». Use el machote de ${tipo} descargado desde esta pantalla.`,
    );

  const filas: FilaExcel[] = [];
  ws.eachRow({ includeEmpty: false }, (row, numero) => {
    if (numero > 1) filas.push({ numero, valores: row.values as unknown[] });
  });
  const leidas = mapearFilas(ws.getRow(1).values as unknown[], filas, columnas);
  if (leidas.faltantes.length)
    throw new ErrorMachote(
      `La hoja «${ws.name}» no tiene las columnas: ${leidas.faltantes.join(', ')}. Use el machote de ${tipo}.`,
    );
  if (!leidas.filas.length) throw new ErrorMachote('El archivo no tiene filas con datos para cargar.');
  if (leidas.filas.length > MAX_FILAS)
    throw new ErrorMachote(
      `El archivo tiene ${leidas.filas.length} filas; el máximo por carga es ${MAX_FILAS}. Divídalo en varios archivos.`,
    );
  return leidas;
}
