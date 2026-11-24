import { Loader2 } from 'lucide-react';

/**
 * Repli de chargement des routes de l'app, repris par le `loading.tsx` de chaque
 * dossier de l'app. Il n'y a plus de `app/loading.tsx` à la racine : une frontière
 * Suspense au-dessus des pages publiques (landing, connexion, inscription, 404)
 * cachait leur contenu derrière « Chargement… » tant que le JavaScript n'avait
 * pas tourné.
 */
export default function RouteLoading(): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Chargement...</span>
      </div>
    </div>
  );
}
