import { describe, expect, it } from 'vitest';
import { crearSeed } from '../api/mock/seed';
import type { Usuario } from '../api/types';
import { construirModelo } from './modelo';
import { tonoCobertura } from './reglas';

function modeloSeed() {
  const db = crearSeed();
  const usuarios: Usuario[] = db.usuarios.map((u) => ({ ...u, vacacion: null }));
  return construirModelo({ ...db, tipos: db.tipos, usuarios });
}

describe('modelo', () => {
  it('faltantes cuenta solo tipos obligatorios', () => {
    const m = modeloSeed();
    for (const u of m.usuarios) {
      for (const t of m.faltantesDe(u)) expect(m.nivel(u, t)).toBe('obligatorio');
    }
  });

  it('pendiente de recuperación no cuenta como tenencia', () => {
    const m = modeloSeed();
    expect(m.tenenciaDe(13)).toHaveLength(0);
  });

  it('marca fuera de perfil cuando el cargo cambia', () => {
    const db = crearSeed();
    // Usuario 11 (Desarrollador) pasa a Auxiliar de almacén (sin laptop)
    const usuarios: Usuario[] = db.usuarios.map((u) => ({ ...u, vacacion: null, ...(u.id === 11 ? { cargoId: 4 } : {}) }));
    const m = construirModelo({ ...db, usuarios });
    expect(m.tenenciaDe(11).some(m.fueraDePerfil)).toBe(true);
  });

  it('semáforo de cobertura', () => {
    expect(tonoCobertura(2, 2)).toBe('ok');
    expect(tonoCobertura(1, 2)).toBe('mid');
    expect(tonoCobertura(0, 2)).toBe('bad');
    expect(tonoCobertura(0, 0)).toBe('neu');
  });
});
