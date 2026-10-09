import {
  completeNewPassword,
  confirmPasswordReset,
  getSessionUser,
  onAuthStateChange,
  requestPasswordReset,
  signInWithEmail,
  signOutUser,
} from '../../../shared/auth/cognito-auth';

/** Autenticación con Cognito (usuario y contraseña; los usuarios los crea TI). */
export const authApi = {
  signIn: (email: string, password: string) => signInWithEmail(email, password),
  completeNewPassword: (password: string) => completeNewPassword(password),
  requestReset: (email: string) => requestPasswordReset(email),
  confirmReset: (email: string, code: string, password: string) =>
    confirmPasswordReset(email, code, password),
  signOut: () => signOutUser(),
  currentUser: () => getSessionUser(),
  onChange: onAuthStateChange,
};
