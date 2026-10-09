import { useState } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import type { ResultadoImportacion } from '../../../shared/api/types';
import type { Modelo } from '../../../shared/domain/modelo';
import { useAccion } from '../../../shared/state/datos';
export { MAX_FILAS } from '../api/machotes';
import { cargasApi } from '../api/cargas-api';
import {
  ARCHIVO,
  ErrorMachote,
  filaReal,
  generarMachote,
  leerMachote,
  listasDesdeModelo,
  type FilasLeidas,
  type TipoCarga,
} from '../api/machotes';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const NOMBRE: Record<TipoCarga, [string, string]> = {
  usuarios: ['usuario', 'usuarios'],
  activos: ['activo', 'activos'],
};
const plural = (n: number, tipo: TipoCarga) => `${n} ${NOMBRE[tipo][n === 1 ? 0 : 1]}`;

function descargarBlob(datos: ArrayBuffer, nombre: string) {
  const url = URL.createObjectURL(new Blob([datos], { type: MIME_XLSX }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Descarga del machote, lectura del archivo, validación previa y aplicación de una carga masiva. */
export function useCargaController(tipo: TipoCarga, m: Modelo) {
  const acc = useAccion();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leidas, setLeidas] = useState<FilasLeidas | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  /** Archivo al que corresponde la última vista previa. */
  const [validadoDe, setValidadoDe] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState<'descarga' | 'validacion' | null>(null);

  const error = (texto: string) => acc.setMsg({ texto, error: true });

  const descargar = async () => {
    setOcupado('descarga');
    try {
      descargarBlob(await generarMachote(tipo, listasDesdeModelo(m)), ARCHIVO[tipo]);
      acc.setMsg(null);
    } catch {
      error('No se pudo generar el machote. Intente de nuevo.');
    } finally {
      setOcupado(null);
    }
  };

  const elegir = (f: File | null) => {
    setResultado(null);
    setLeidas(null);
    setValidadoDe(null);
    acc.setMsg(null);
    if (f && !/\.xlsx$/i.test(f.name)) {
      setArchivo(null);
      return error(
        `«${f.name}» no es un archivo .xlsx. Guarde el machote como «Libro de Excel (.xlsx)».`,
      );
    }
    setArchivo(f);
  };

  const validar = async () => {
    if (!archivo) return error('Seleccione el machote lleno (.xlsx).');
    setOcupado('validacion');
    setResultado(null);
    try {
      const l = await leerMachote(tipo, await archivo.arrayBuffer());
      const r = await cargasApi.importar(tipo, l.filas, false);
      setLeidas(l);
      setResultado(r);
      setValidadoDe(archivo);
      acc.setMsg(
        r.errores
          ? {
              texto: `${r.errores} de ${r.filas.length} filas tienen error. Corríjalas en el archivo y vuelva a validar.`,
              error: true,
            }
          : {
              texto: `${plural(r.validas, tipo)} listos para cargar. Revise y pulse «Aplicar carga».`,
              error: false,
            },
      );
    } catch (e) {
      error(
        e instanceof ErrorMachote || e instanceof ApiError
          ? e.message
          : 'Ocurrió un error inesperado al validar el archivo.',
      );
    } finally {
      setOcupado(null);
    }
  };

  const puedeAplicar =
    !!archivo &&
    !!leidas &&
    !!resultado &&
    !resultado.aplicado &&
    resultado.errores === 0 &&
    validadoDe === archivo;

  const aplicar = async () => {
    if (!puedeAplicar || !leidas) return;
    const r = await acc.ejecutar(
      () => cargasApi.importar(tipo, leidas.filas, true),
      (x) =>
        x.aplicado
          ? `Carga aplicada: se cargaron ${plural(x.validas, tipo)}.`
          : 'No se aplicó la carga.',
    );
    if (!r) return;
    setResultado(r);
    if (!r.aplicado)
      error(
        `No se aplicó la carga: ${r.errores} filas tienen error (los datos cambiaron desde la validación). Corríjalas y vuelva a validar.`,
      );
  };

  return {
    tipo,
    acc,
    archivo,
    resultado,
    ocupado,
    pendiente: ocupado !== null || acc.pendiente,
    puedeAplicar,
    /** Fila real del Excel para la fila que informa el backend (se omiten las filas vacías al enviar). */
    fila: (n: number) => (leidas ? filaReal(leidas.numeros, n) : n),
    descargar,
    elegir,
    validar,
    aplicar,
  };
}

export type CargaController = ReturnType<typeof useCargaController>;
