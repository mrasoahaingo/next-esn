import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { queryKeys } from './keys';

export type ProspectionSettingsResponse = {
  heat_threshold: number;
  /** Vrai tant qu'aucun réglage n'est enregistré pour l'org (seuil par défaut). */
  is_default: boolean;
  updated_at?: string;
};

export function useProspectionSettings() {
  const { isSignedIn, orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.prospection.settings(orgId ?? ''),
    queryFn: async (): Promise<ProspectionSettingsResponse> => {
      const res = await fetch('/api/prospection/settings');
      if (!res.ok) throw new Error('Impossible de charger les réglages de prospection');
      return res.json();
    },
    enabled: !!isSignedIn && !!orgId,
  });
}

export function useUpdateProspectionSettings() {
  const qc = useQueryClient();
  const { orgId } = useAuth();

  return useMutation({
    mutationFn: async ({
      heat_threshold,
    }: {
      heat_threshold: number;
    }): Promise<ProspectionSettingsResponse> => {
      const res = await fetch('/api/prospection/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heat_threshold }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === 'string' ? err.error : "Erreur lors de l'enregistrement du seuil",
        );
      }
      return res.json();
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.prospection.settings(orgId ?? '') }),
  });
}
