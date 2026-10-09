import { useState, type FormEvent } from 'react';
import { authApi } from '../api/auth-api';

export type Paso = 'ingreso' | 'nueva-clave' | 'olvido' | 'codigo';

const MENSAJES_PASO: Record<string, string> = {
  CONFIRM_SIGN_UP: 'Su cuenta aún no está confirmada. Contacte a TI.',
  RESET_PASSWORD: 'Debe restablecer su contraseña.',
};

const textoError = (e: unknown) => {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAuthorizedException') return 'Correo o contraseña incorrectos.';
  if (name === 'UserNotFoundException') return 'Correo o contraseña incorrectos.';
  if (name === 'InvalidPasswordException')
    return 'La contraseña no cumple la política: mínimo 12 caracteres, mayúsculas, minúsculas, números y símbolos.';
  if (name === 'CodeMismatchException') return 'El código no es válido.';
  if (name === 'LimitExceededException') return 'Demasiados intentos. Espere unos minutos.';
  return (e as Error)?.message || 'No fue posible iniciar sesión.';
};

export function useLoginController() {
  const [paso, setPaso] = useState<Paso>('ingreso');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const correr = async (fn: () => Promise<void>) => {
    setCargando(true);
    setError(null);
    setAviso(null);
    try {
      await fn();
    } catch (e) {
      setError(textoError(e));
    } finally {
      setCargando(false);
    }
  };

  const enviar = (event: FormEvent) => {
    event.preventDefault();
    if (paso === 'ingreso')
      return correr(async () => {
        const r = await authApi.signIn(correo.trim(), clave);
        if (r.nextStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          setClave('');
          setPaso('nueva-clave');
        } else if (!r.isSignedIn)
          setError(MENSAJES_PASO[r.nextStep] ?? 'No fue posible iniciar sesión.');
      });
    if (paso === 'nueva-clave')
      return correr(async () => void (await authApi.completeNewPassword(clave)));
    if (paso === 'olvido')
      return correr(async () => {
        await authApi.requestReset(correo.trim());
        setPaso('codigo');
        setAviso('Le enviamos un código a su correo.');
      });
    return correr(async () => {
      await authApi.confirmReset(correo.trim(), codigo.trim(), clave);
      setPaso('ingreso');
      setClave('');
      setAviso('Contraseña actualizada. Ingrese con la nueva contraseña.');
    });
  };

  const ir = (p: Paso) => {
    setPaso(p);
    setError(null);
    setAviso(null);
  };

  return {
    paso,
    ir,
    correo,
    setCorreo,
    clave,
    setClave,
    codigo,
    setCodigo,
    error,
    aviso,
    cargando,
    enviar,
  };
}
