import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type {
  EdicionOperador,
  EdicionRol,
  Id,
  NuevoOperador,
  NuevoRol,
  Operador,
  PermisoInfo,
  Rol,
} from '../../../shared/api/types';
import { K, useAccion, useSesion } from '../../../shared/state/datos';
import { seguridadApi } from '../api/seguridad-api';

/** Permisos agrupados por módulo, en el orden en que llegan del servidor. */
export type GrupoPermisos = { modulo: string; permisos: PermisoInfo[] }[];

function agrupar(lista: PermisoInfo[]): GrupoPermisos {
  const grupos: GrupoPermisos = [];
  for (const p of lista) {
    const g = grupos.find((x) => x.modulo === p.modulo);
    if (g) g.permisos.push(p);
    else grupos.push({ modulo: p.modulo, permisos: [p] });
  }
  return grupos;
}

/** Roles, permisos y personas con acceso; altas y cambios con mensaje de resultado. */
export function useSeguridadController() {
  const acc = useAccion();
  const sesion = useSesion().data;
  const permisos = useQuery({
    queryKey: [K, 'permisos'],
    queryFn: ({ signal }) => seguridadApi.permisos({ signal }),
    staleTime: 10 * 60_000,
  });
  const roles = useQuery({
    queryKey: [K, 'roles'],
    queryFn: ({ signal }) => seguridadApi.roles({ signal }),
  });
  const operadores = useQuery({
    queryKey: [K, 'operadores-seguridad'],
    queryFn: ({ signal }) => seguridadApi.operadores({ signal }),
  });

  const grupos = useMemo(() => agrupar(permisos.data ?? []), [permisos.data]);
  const listaRoles: Rol[] = roles.data ?? [];
  const listaOperadores: Operador[] = operadores.data ?? [];
  const rolSistema = new Set(listaRoles.filter((r) => r.esSistema).map((r) => r.id));
  const superadmin = !!sesion?.superadmin;

  const personasConRol = (rolId: Id) => listaOperadores.filter((o) => o.rolId === rolId).length;
  const esPropio = (o: Operador) => sesion?.operadorId != null && o.id === sesion.operadorId;
  /** Solo un superadministrador puede tocar a otro superadministrador. */
  const puedeEditar = (o: Operador) => !esPropio(o) && (superadmin || !rolSistema.has(o.rolId));
  /** Roles que se pueden asignar (activos; el del sistema solo lo asigna un superadministrador). */
  const rolesAsignables = listaRoles.filter((r) => r.activo && (superadmin || !r.esSistema));

  const crearRol = (datos: NuevoRol) =>
    acc.ejecutar(
      () => seguridadApi.crearRol(datos),
      (r) => `Rol «${r.nombre}» creado.`,
    );
  const editarRol = (id: Id, datos: EdicionRol, ok: string) =>
    acc.ejecutar(() => seguridadApi.editarRol(id, datos), ok);
  const invitar = (datos: NuevoOperador) =>
    acc.ejecutar(
      () => seguridadApi.invitarOperador(datos),
      `Se envió la invitación a ${datos.correo}. Recibirá una contraseña temporal por correo.`,
    );
  const editarOperador = (o: Operador, datos: EdicionOperador, ok: string) =>
    acc.ejecutar(() => seguridadApi.editarOperador(o.id, datos), ok);

  const error = permisos.error ?? roles.error ?? operadores.error;
  return {
    acc,
    cargando: permisos.isLoading || roles.isLoading || operadores.isLoading,
    error: error ? (error as Error).message : null,
    grupos,
    roles: listaRoles,
    operadores: listaOperadores,
    superadmin,
    personasConRol,
    esPropio,
    puedeEditar,
    rolesAsignables,
    crearRol,
    editarRol,
    invitar,
    editarOperador,
  };
}

export type SeguridadController = ReturnType<typeof useSeguridadController>;
