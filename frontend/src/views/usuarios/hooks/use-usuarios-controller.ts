import { useState } from 'react';
import type { EstadoUsuario, Usuario } from '../../../shared/api/types';
import type { Modelo } from '../../../shared/domain/modelo';
import { useAccion } from '../../../shared/state/datos';
import { coincide, useFiltros } from '../../../shared/state/filtros';
import { usuariosApi } from '../api/usuarios-api';

export const FORM_USUARIO_VACIO = {
  codigo: '',
  nombre: '',
  correo: '',
  cargoId: '',
  departamentoId: '',
};
export type FormUsuario = typeof FORM_USUARIO_VACIO;

/** Listado filtrado (silo, departamento, búsqueda, estado) y alta de colaboradores. */
export function useUsuariosController(m: Modelo, onCreado: (u: Usuario) => void) {
  const f = useFiltros();
  const [fEstado, setFEstado] = useState<'' | EstadoUsuario>('');
  const [form, setForm] = useState<FormUsuario>(FORM_USUARIO_VACIO);
  const accion = useAccion();

  const filas = m.usuarios.filter((u) => coincide(m, f, u) && (!fEstado || u.estado === fEstado));
  const cargoForm = form.cargoId ? m.idx.cargo.get(Number(form.cargoId)) : undefined;

  const crear = async () => {
    if (!form.codigo.trim() || !form.nombre.trim() || !form.cargoId || !form.departamentoId) {
      accion.setMsg({
        texto: 'Código, nombre, cargo y departamento son obligatorios.',
        error: true,
      });
      return;
    }
    const u = await accion.ejecutar(
      () =>
        usuariosApi.crear({
          codigo: form.codigo,
          nombre: form.nombre,
          correo: form.correo || null,
          cargoId: Number(form.cargoId),
          departamentoId: Number(form.departamentoId),
        }),
      (r) => `Usuario ${r.nombre} creado con la dotación de su cargo.`,
    );
    if (u) {
      setForm(FORM_USUARIO_VACIO);
      onCreado(u);
    }
  };

  return { filas, fEstado, setFEstado, form, setForm, cargoForm, crear, accion };
}
