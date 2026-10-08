import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Usuario } from '../api/types';
import type { Modelo } from '../domain/modelo';

interface Filtros {
  silo: string;
  depto: string;
  q: string;
  setSilo(v: string): void;
  setDepto(v: string): void;
  setQ(v: string): void;
  limpiar(): void;
}

const Ctx = createContext<Filtros | null>(null);

/** Filtros de silo, departamento y búsqueda compartidos entre Resumen y Usuarios. */
export function FiltrosProvider({ children }: { children: ReactNode }) {
  const [silo, setSiloRaw] = useState('');
  const [depto, setDepto] = useState('');
  const [q, setQ] = useState('');
  const v = useMemo<Filtros>(() => ({
    silo, depto, q,
    setSilo: (x) => { setSiloRaw(x); setDepto(''); },
    setDepto, setQ,
    limpiar: () => { setSiloRaw(''); setDepto(''); setQ(''); },
  }), [silo, depto, q]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useFiltros(): Filtros {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFiltros fuera de FiltrosProvider');
  return c;
}

/** Usuario dentro del alcance silo/departamento. */
export function enAlcance(m: Modelo, f: Pick<Filtros, 'silo' | 'depto'>, u: Usuario): boolean {
  return (!f.silo || String(m.siloIdDe(u)) === f.silo) && (!f.depto || String(u.departamentoId) === f.depto);
}

/** Alcance + búsqueda por nombre, código o cargo. */
export function coincide(m: Modelo, f: Pick<Filtros, 'silo' | 'depto' | 'q'>, u: Usuario): boolean {
  if (!enAlcance(m, f, u)) return false;
  const q = f.q.trim().toLowerCase();
  if (!q) return true;
  return `${u.nombre} ${u.codigo} ${m.cargoDe(u)?.nombre ?? ''} ${u.correo ?? ''}`.toLowerCase().includes(q);
}
