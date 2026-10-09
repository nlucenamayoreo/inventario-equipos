import { describe, expect, it } from 'vitest';
import {
  COLUMNAS,
  ESTADOS_CARGA,
  celdaATexto,
  filaReal,
  generarMachote,
  leerMachote,
  mapearFilas,
  normalizarEncabezado,
  type ListasMachote,
} from './machotes';

describe('normalizarEncabezado', () => {
  it('ignora mayúsculas, acentos, espacios y guiones bajos', () => {
    expect(normalizarEncabezado('  Código usuario ')).toBe('codigousuario');
    expect(normalizarEncabezado('codigo_usuario')).toBe('codigousuario');
    expect(normalizarEncabezado('CARACTERÍSTICAS')).toBe('caracteristicas');
  });
});

describe('celdaATexto', () => {
  it('convierte los tipos de celda de exceljs a texto', () => {
    expect(celdaATexto(null)).toBe('');
    expect(celdaATexto('  hola ')).toBe('hola');
    expect(celdaATexto(1025)).toBe('1025');
    expect(celdaATexto({ richText: [{ text: 'Lap' }, { text: 'top' }] })).toBe('Laptop');
    expect(celdaATexto({ text: 'a@b.com', hyperlink: 'mailto:a@b.com' })).toBe('a@b.com');
    expect(celdaATexto({ hyperlink: 'mailto:x@y.com' })).toBe('x@y.com');
    expect(celdaATexto({ formula: 'A1', result: 7 })).toBe('7');
    expect(celdaATexto(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01-05');
  });
});

describe('mapearFilas', () => {
  const cols = COLUMNAS.usuarios;

  it('acepta encabezados amigables o claves y conserva el número de fila de Excel', () => {
    // índice = número de columna (1 = A), como row.values de exceljs
    const enc = [undefined, 'Código', 'NOMBRE', 'correo', 'Cargo', 'Departamento', 'Otra'];
    const r = mapearFilas(
      enc,
      [
        { numero: 2, valores: [undefined, 'E1', 'Ana', null, 'Analista', 'Ventas', 'x'] },
        { numero: 3, valores: [undefined, '', ' ', null] },
        { numero: 5, valores: [undefined, 77, 'Luis', { text: 'l@m.biz', hyperlink: 'mailto:l@m.biz' }, 'Jefe', 'TI'] },
      ],
      cols,
    );
    expect(r.faltantes).toEqual([]);
    expect(r.numeros).toEqual([2, 5]);
    expect(r.filas[0]).toEqual({ codigo: 'E1', nombre: 'Ana', correo: null, cargo: 'Analista', departamento: 'Ventas' });
    expect(r.filas[1]).toMatchObject({ codigo: '77', correo: 'l@m.biz' });
    expect(filaReal(r.numeros, 2)).toBe(2);
    expect(filaReal(r.numeros, 3)).toBe(5);
  });

  it('informa las columnas obligatorias que faltan', () => {
    const r = mapearFilas([undefined, 'Nombre'], [], cols);
    expect(r.faltantes).toEqual(['Código', 'Cargo', 'Departamento']);
  });
});

describe('machote de ida y vuelta', () => {
  const listas: ListasMachote = {
    cargos: ['Analista'],
    departamentos: ['Ventas'],
    silos: ['Mayoreo'],
    tipos: ['Laptop'],
    marcas: ['Dell'],
    modelos: ['Latitude'],
    estados: ESTADOS_CARGA,
    codigosUsuario: ['E1'],
    correosCustodio: [],
  };

  it('genera un machote que se puede leer y rechaza el vacío', async () => {
    const buf = await generarMachote('activos', listas);
    await expect(leerMachote('activos', buf)).rejects.toThrow('no tiene filas');
    await expect(leerMachote('usuarios', buf)).rejects.toThrow('hoja «Usuarios»');

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.getWorksheet('Listas')?.state).toBe('hidden');
    const ws = wb.getWorksheet('Activos')!;
    ws.getRow(4).values = ['Laptop', 'Dell', 'Latitude', null, 'RAM: 16 GB', 'S-1'];
    const leidas = await leerMachote('activos', (await wb.xlsx.writeBuffer()) as ArrayBuffer);
    expect(leidas.numeros).toEqual([4]);
    expect(leidas.filas[0]).toMatchObject({ tipo: 'Laptop', serial: 'S-1', estado: null });
  });
});
