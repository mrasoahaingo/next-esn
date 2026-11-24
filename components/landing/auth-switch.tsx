'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';

/**
 * Bascule « déconnecté / connecté » des pages publiques. La variante
 * déconnectée est rendue d'emblée (côté serveur, sans JavaScript, pendant le
 * chargement de Clerk) ; la variante connectée ne la remplace qu'une fois la
 * session confirmée. Contrairement à `Show` côté serveur, rien n'attend
 * `auth()` : la landing reste statique et s'affiche sans flux différé.
 */
export function AuthSwitch({
  signedOut,
  signedIn,
}: {
  signedOut: ReactNode;
  signedIn: ReactNode;
}): React.JSX.Element {
  const { isLoaded, userId } = useAuth();
  return <>{isLoaded && userId ? signedIn : signedOut}</>;
}
