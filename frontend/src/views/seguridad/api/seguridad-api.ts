import type { Opts } from '../../../shared/api/client';
import { backend } from '../../../shared/api/backend';
import type {
  EdicionOperador,
  EdicionRol,
  Id,
  NuevoOperador,
  NuevoRol,
} from '../../../shared/api/types';

export const seguridadApi = {
  permisos: (opts?: Opts) => backend.permisos(opts),
  roles: (opts?: Opts) => backend.roles(opts),
  crearRol: (datos: NuevoRol) => backend.crearRol(datos),
  editarRol: (id: Id, datos: EdicionRol) => backend.editarRol(id, datos),
  operadores: (opts?: Opts) => backend.operadores(opts),
  invitarOperador: (datos: NuevoOperador) => backend.invitarOperador(datos),
  editarOperador: (id: Id, datos: EdicionOperador) => backend.editarOperador(id, datos),
};
