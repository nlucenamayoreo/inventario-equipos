import { Aviso } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { usePermiso } from '../../../shared/state/datos';
import { CaracteristicasTipo } from '../components/caracteristicas-tipo';
import { CatalogosBasicos } from '../components/catalogos-basicos';
import { MarcasModelos } from '../components/marcas-modelos';
import { PerfilesDotacion } from '../components/perfiles-dotacion';
import { TablaArticulos } from '../components/tabla-articulos';
import { useCatalogosController } from '../hooks/use-catalogos-controller';
import { useMaestrosController } from '../hooks/use-maestros-controller';

export function CatalogosPage({ m }: { m: Modelo }) {
  const gestionaCatalogos = usePermiso('catalogos.gestionar');
  const gestionaArticulos = usePermiso('articulos.gestionar');
  const c = useCatalogosController(m);
  const mc = useMaestrosController(m, c.acc);
  const art = { m, mc, puede: gestionaArticulos, pendiente: c.acc.pendiente };
  return (
    <div className="col" style={{ gap: 14 }}>
      <Aviso msg={c.acc.msg} />
      <CatalogosBasicos m={m} c={c} admin={gestionaCatalogos} />
      <PerfilesDotacion m={m} c={c} admin={gestionaCatalogos} />
      <MarcasModelos {...art} />
      <CaracteristicasTipo {...art} />
      <TablaArticulos {...art} />
    </div>
  );
}
