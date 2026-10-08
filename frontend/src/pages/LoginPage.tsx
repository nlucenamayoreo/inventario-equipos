import { config } from '../config';
import { Logo } from '../components/Layout';

export function LoginPage() {
  const volver = encodeURIComponent(window.location.href);
  return (
    <main className="login">
      <div className="tarjeta">
        <Logo />
        <div className="col" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 20 }}>Inventario de Equipos TI</h1>
          <span className="tenue">Ingrese con su cuenta corporativa de Google.</span>
        </div>
        <a className="btn btn-primario btn-lg" href={`${config.loginUrl}?redirect=${volver}`}>Ingresar con Google</a>
      </div>
    </main>
  );
}
