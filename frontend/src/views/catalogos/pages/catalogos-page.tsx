import { Aviso } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { useEsAdmin } from '../../../shared/state/datos';
import { CatalogosBasicos } from '../components/catalogos-basicos';
import { PerfilesDotacion } from '../components/perfiles-dotacion';
import { TablaArticulos } from '../components/tabla-articulos';
import { useCatalogosController } from '../hooks/use-catalogos-controller';

export function CatalogosPage({ m }: { m: Modelo }) {
  const admin = useEsAdmin();
  const c = useCatalogosController(m);
  return (
    <div className="col" style={{ gap: 14 }}>
      <Aviso msg={c.acc.msg} />
      <CatalogosBasicos m={m} c={c} admin={admin} />
      <PerfilesDotacion m={m} c={c} admin={admin} />
      <TablaArticulos m={m} />
    </div>
  );
}
