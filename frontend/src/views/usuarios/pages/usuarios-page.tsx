import { useNavigate, useParams } from 'react-router-dom';
import type { Modelo } from '../../../shared/domain/modelo';
import { usePermiso } from '../../../shared/state/datos';
import { CrearUsuario } from '../components/crear-usuario';
import { FichaUsuario } from '../components/ficha-usuario';
import { TablaUsuarios } from '../components/tabla-usuarios';
import { useUsuariosController } from '../hooks/use-usuarios-controller';

export function UsuariosPage({ m }: { m: Modelo }) {
  const { id } = useParams();
  const nav = useNavigate();
  const admin = usePermiso('usuarios.gestionar');
  const c = useUsuariosController(m, (u) => nav(`/usuarios/${u.id}`));
  const sel = id ? m.idx.usuario.get(Number(id)) : undefined;

  return (
    <div className="dos-col">
      <div className="principal">
        {admin && <CrearUsuario m={m} c={c} />}
        <TablaUsuarios
          m={m}
          filas={c.filas}
          selId={sel?.id}
          fEstado={c.fEstado}
          setFEstado={c.setFEstado}
          onVer={(uid) => nav(`/usuarios/${uid}`)}
        />
      </div>
      <aside aria-label="Ficha del usuario" className="lateral">
        {sel ? (
          <FichaUsuario key={sel.id} m={m} u={sel} onEliminado={() => nav('/usuarios')} />
        ) : (
          <p className="tenue">
            {id
              ? 'El usuario no existe o fue eliminado.'
              : 'Seleccione un usuario para ver y gestionar sus equipos.'}
          </p>
        )}
      </aside>
    </div>
  );
}
