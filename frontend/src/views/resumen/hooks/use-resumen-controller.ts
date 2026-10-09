import { useMemo } from 'react';
import type { TonoPill } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { esVigente, tonoCobertura } from '../../../shared/domain/reglas';
import { coincide, enAlcance, useFiltros } from '../../../shared/state/filtros';

/** Indicadores, cobertura, stock y matriz del Resumen para el filtro actual (solo tipos obligatorios). */
export function useResumenController(m: Modelo) {
  const f = useFiltros();
  const r = useMemo(() => {
    const alcance = m.usuarios.filter((u) => enAlcance(m, f, u));
    const vigentes = alcance.filter(esVigente);
    const filtrados = vigentes.filter((u) => coincide(m, f, u));
    const cnt = (e: string) => m.activos.filter((a) => a.estado === e).length;
    const faltan = new Map(vigentes.map((u) => [u.id, m.faltantesDe(u)]));
    const conFaltantes = vigentes.filter((u) => faltan.get(u.id)!.length > 0).length;
    const fuera = m.activos.filter(m.fueraDePerfil).length;
    const desactivados = alcance.filter((u) => u.estado === 'desactivado').length;

    const kpis: { label: string; val: number; sub: string; color: string }[] = [
      {
        label: 'Equipos activos',
        val: m.activos.length - cnt('de_baja'),
        sub: 'Excluye equipos de baja',
        color: 'var(--texto)',
      },
      {
        label: 'Asignados',
        val: cnt('asignado'),
        sub: 'En uso por su titular',
        color: 'var(--primario)',
      },
      {
        label: 'Resguardo / préstamo',
        val: cnt('en_resguardo') + cnt('prestamo'),
        sub: `${cnt('en_resguardo')} en TI · ${cnt('prestamo')} prestados`,
        color: 'var(--pur)',
      },
      {
        label: 'Disponibles',
        val: cnt('disponible'),
        sub: 'Listos para asignar',
        color: 'var(--ok)',
      },
      {
        label: 'Usuarios de vacaciones',
        val: vigentes.filter((u) => u.estado === 'vacaciones').length,
        sub: 'En el filtro actual',
        color: 'var(--mid)',
      },
      {
        label: 'Usuarios con faltantes',
        val: conFaltantes,
        sub: `${vigentes.length - conFaltantes} de ${vigentes.length} con dotación obligatoria completa`,
        color: 'var(--bad)',
      },
      {
        label: 'Fuera de perfil',
        val: fuera,
        sub: 'Equipos que el cargo no permite',
        color: 'var(--pur)',
      },
      {
        label: 'Usuarios desactivados',
        val: desactivados,
        sub: 'Detectados en Google o manual',
        color: 'var(--bad)',
      },
      {
        label: 'Pendientes de recuperación',
        val: cnt('pendiente_recuperacion'),
        sub: 'Equipos de usuarios desactivados',
        color: 'var(--bad)',
      },
    ];

    const tiene = (uid: number, t: number) => m.tiposTenidos(uid).has(t);

    const silos = m.silos
      .filter((s) => !f.silo || String(s.id) === f.silo)
      .map((s) => {
        const us = m.usuarios.filter((u) => esVigente(u) && m.siloIdDe(u) === s.id);
        let eq = 0,
          hv = 0,
          tot = 0;
        for (const u of us) {
          eq += m.tenenciaDe(u.id).length;
          for (const t of m.tiposIds)
            if (m.nivel(u, t) === 'obligatorio') {
              tot++;
              if (tiene(u.id, t)) hv++;
            }
        }
        return {
          s,
          usuarios: us.length,
          eq,
          faltantes: tot - hv,
          pct: tot ? Math.round((hv / tot) * 100) : 0,
          tono: tonoCobertura(hv, tot),
        };
      });

    const deptos = m.departamentos
      .filter(
        (d) => (!f.silo || String(d.siloId) === f.silo) && (!f.depto || String(d.id) === f.depto),
      )
      .map((d) => {
        const us = m.usuarios.filter((u) => esVigente(u) && u.departamentoId === d.id);
        let gaps = 0;
        const celdas = m.tiposIds.map((t) => {
          const req = us.filter((u) => m.nivel(u, t) === 'obligatorio');
          const hv = req.filter((u) => tiene(u.id, t)).length;
          gaps += req.length - hv;
          return {
            t,
            txt: req.length ? `${hv} / ${req.length}` : '—',
            tono: tonoCobertura(hv, req.length),
          };
        });
        return { d, n: us.length, celdas, gaps };
      });

    const stock = m.tipos.map((t) => ({
      t,
      n: m.activos.filter((a) => a.estado === 'disponible' && m.tipoDeActivo(a) === t.id).length,
    }));

    const matriz = filtrados.map((u) => {
      const mios = m.tenenciaDe(u.id);
      const celdas = m.tiposIds.map((t): { t: number; txt: string; tono: TonoPill } => {
        const hit = mios.filter((a) => m.tipoDeActivo(a) === t);
        if (hit.length) {
          const fueraP = hit.some(m.fueraDePerfil);
          const fuera = hit.every((a) => a.estado !== 'asignado');
          return {
            t,
            txt: hit.map((a) => a.serial).join(', ') + (fueraP ? ' · fuera de perfil' : ''),
            tono: fueraP ? 'pur' : fuera ? 'mid' : 'ok',
          };
        }
        const lv = m.nivel(u, t);
        if (lv === 'obligatorio') return { t, txt: 'Falta', tono: 'bad' };
        if (lv === 'permitido') return { t, txt: 'Opcional', tono: 'neu' };
        return { t, txt: 'No aplica', tono: 'na' };
      });
      return { u, celdas, falt: faltan.get(u.id)!.length };
    });

    return { kpis, silos, deptos, stock, matriz };
  }, [m, f]);
  return r;
}
