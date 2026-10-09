import { Seccion } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { MaestrosController } from '../hooks/use-maestros-controller';
import { ListaMarcas } from './lista-marcas';
import { ListaModelos } from './lista-modelos';

export function MarcasModelos({
  m,
  mc,
  puede,
  pendiente,
}: {
  m: Modelo;
  mc: MaestrosController;
  puede: boolean;
  pendiente: boolean;
}) {
  return (
    <Seccion
      titulo="Marcas y modelos"
      caja
      extra={
        <span className="sec-nota" style={{ width: '100%' }}>
          Cada modelo pertenece a una marca y a un tipo de equipo. Los inactivos no se ofrecen al
          crear artículos.
        </span>
      }
    >
      <div className="fila" style={{ alignItems: 'flex-start', gap: 20 }}>
        <div className="col" style={{ flex: '1 1 260px', minWidth: 0 }}>
          <ListaMarcas m={m} mc={mc} puede={puede} pendiente={pendiente} />
        </div>
        <div className="col" style={{ flex: '999 1 420px', minWidth: 0 }}>
          <ListaModelos m={m} mc={mc} puede={puede} pendiente={pendiente} />
        </div>
      </div>
    </Seccion>
  );
}
