import { Campo } from '../../../shared/components/ui';
import { Logo } from '../../../shared/components/layout';
import { useLoginController } from '../hooks/use-login-controller';

const TITULOS = {
  ingreso: 'Ingrese con su correo corporativo.',
  'nueva-clave': 'Defina una nueva contraseña para continuar.',
  olvido: 'Indique su correo y le enviaremos un código.',
  codigo: 'Escriba el código recibido y su nueva contraseña.',
} as const;

const AUTOCOMPLETE_CLAVE: Partial<Record<string, string>> = { ingreso: 'current-password' };

export function LoginPage() {
  const c = useLoginController();
  const pideCorreo = c.paso !== 'nueva-clave';
  const pideClave = c.paso !== 'olvido';
  return (
    <main className="login">
      <form className="tarjeta" onSubmit={c.enviar}>
        <Logo />
        <div className="col" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 20 }}>Inventario de Equipos TI</h1>
          <span className="tenue">{TITULOS[c.paso]}</span>
        </div>
        {pideCorreo && (
          <Campo label="Correo" style={{ width: '100%' }}>
            <input
              className="in"
              type="email"
              autoComplete="username"
              required
              value={c.correo}
              onChange={(e) => c.setCorreo(e.target.value)}
            />
          </Campo>
        )}
        {c.paso === 'codigo' && (
          <Campo label="Código" style={{ width: '100%' }}>
            <input
              className="in"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={c.codigo}
              onChange={(e) => c.setCodigo(e.target.value)}
            />
          </Campo>
        )}
        {pideClave && (
          <Campo
            label={c.paso === 'ingreso' ? 'Contraseña' : 'Nueva contraseña'}
            style={{ width: '100%' }}
          >
            <input
              className="in"
              type="password"
              required
              minLength={c.paso === 'ingreso' ? undefined : 12}
              autoComplete={AUTOCOMPLETE_CLAVE[c.paso] ?? 'new-password'}
              value={c.clave}
              onChange={(e) => c.setClave(e.target.value)}
            />
          </Campo>
        )}
        {c.error && (
          <span className="msg msg-err" role="alert">
            {c.error}
          </span>
        )}
        {c.aviso && (
          <span className="msg msg-ok" role="status">
            {c.aviso}
          </span>
        )}
        <button
          type="submit"
          className="btn btn-primario btn-lg"
          style={{ width: '100%' }}
          disabled={c.cargando}
        >
          {c.paso === 'ingreso'
            ? 'Ingresar'
            : c.paso === 'olvido'
              ? 'Enviar código'
              : 'Guardar contraseña'}
        </button>
        {c.paso === 'ingreso' ? (
          <button type="button" className="btn btn-sm btn-link" onClick={() => c.ir('olvido')}>
            Olvidé mi contraseña
          </button>
        ) : (
          <button type="button" className="btn btn-sm" onClick={() => c.ir('ingreso')}>
            Volver
          </button>
        )}
      </form>
    </main>
  );
}
