import { backend } from '../../../shared/api/backend';
import type { EdicionUsuario, Id, NuevaVacacion, NuevoUsuario } from '../../../shared/api/types';

export const usuariosApi = {
  crear: (datos: NuevoUsuario) => backend.crearUsuario(datos),
  editar: (id: Id, datos: EdicionUsuario) => backend.editarUsuario(id, datos),
  eliminar: (id: Id) => backend.eliminarUsuario(id),
  registrarVacaciones: (id: Id, datos: NuevaVacacion) => backend.registrarVacaciones(id, datos),
  finalizarVacaciones: (id: Id) => backend.finalizarVacaciones(id),
  desactivar: (id: Id) => backend.desactivarUsuario(id),
  reactivar: (id: Id) => backend.reactivarUsuario(id),
  /** Asignación desde la ficha: el backend valida el perfil del cargo. */
  asignarEquipo: (activoId: Id, usuarioId: Id) => backend.asignarActivo(activoId, usuarioId),
  liberarEquipo: (activoId: Id) => backend.liberarActivo(activoId),
};
