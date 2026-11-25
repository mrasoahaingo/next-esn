'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import type { PositioningGenerateStreamMeta } from '@/lib/types/positioning-generate-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import dynamic from 'next/dynamic';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';

function EmailSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label={label}>
      <Skeleton className="h-8 w-full animate-none" />
      <Skeleton className="h-3 w-5/6 animate-none" />
      <Skeleton className="h-3 w-2/3 animate-none" />
      <Skeleton className="h-3 w-3/4 animate-none" />
      <Skeleton className="h-3 w-1/2 animate-none" />
    </div>
  );
}

const EmailEditor = dynamic(
  () => import('./EmailEditor').then((m) => m.EmailEditor),
  { loading: () => <EmailSkeleton label="Chargement de l’éditeur" /> },
);

type EmailVariant = 'full' | 'firstContact' | 'bulletPoints';

type EmailBranch = 'email' | 'emailFirstContact' | 'emailBulletPoints' | 'candidateEmail';

interface EmailsGenerationStepProps {
  isStreaming: boolean;
  streamMeta?: PositioningGenerateStreamMeta | null;
  onGenerateEmails: () => void;
  positioningStatus?: string | null;
  /** Détail par tâche LLM des modèles utilisés lors de la dernière génération. */
  generationModelsByTask?: Record<string, string> | null;
}

/**
 * Étape 2 : deux panneaux côte à côte, « E-mail client » (trois variantes en liens-onglets
 * sur une bande sous l'en-tête) et « E-mail candidat ». Pendant la génération, une
 * pastille « En cours » dans l'en-tête et des squelettes dans le corps ; l'état du flux
 * est dans la zone `status` de l'en-tête de page, pas ici.
 */
export function EmailsGenerationStep({
  isStreaming,
  streamMeta,
  onGenerateEmails,
  positioningStatus,
  generationModelsByTask,
}: EmailsGenerationStepProps) {
  const {
    email,
    emailFirstContact,
    emailBulletPoints,
    candidateEmail,
    setEmail,
    setEmailFirstContact,
    setEmailBulletPoints,
    setCandidateEmail,
  } = usePositioningStore();

  const [activeEmailVariant, setActiveEmailVariant] = useState<EmailVariant>('full');

  const hasEmails =
    !!email || !!emailFirstContact || !!emailBulletPoints || !!candidateEmail;
  const activeBranches = streamMeta?.activeBranches ?? [];
  const generateMode = streamMeta?.generateMode;
  const emailsRun =
    isStreaming && (generateMode === 'emails' || generateMode === 'all' || generateMode === undefined);
  const cvOnlyRun = isStreaming && generateMode === 'cv';

  const busy = (branch: EmailBranch) => emailsRun && activeBranches.includes(branch);
  /** Un e-mail attendu par l'exécution en cours et pas encore arrivé : squelette. */
  const awaiting = (value: unknown) => emailsRun && !value;

  const regenLabel =
    positioningStatus === 'error' ? 'Relancer la génération' : hasEmails ? 'Régénérer' : 'Générer';

  const variantContent: Record<EmailVariant, { branch: EmailBranch; value: typeof email; set: typeof setEmail; title: string }> = {
    full: { branch: 'email', value: email, set: setEmail, title: 'E-mail complet de positionnement' },
    firstContact: {
      branch: 'emailFirstContact',
      value: emailFirstContact,
      set: setEmailFirstContact,
      title: 'E-mail de première prise de contact',
    },
    bulletPoints: {
      branch: 'emailBulletPoints',
      value: emailBulletPoints,
      set: setEmailBulletPoints,
      title: 'E-mail en points clés',
    },
  };

  const clientBusy = busy(variantContent[activeEmailVariant].branch);

  return (
    <div className="space-y-4">
      {cvOnlyRun && !hasEmails ? (
        <p className="text-sm text-muted-foreground">
          Cette exécution ne régénère que le CV : ouvrez l’étape « CV retravaillé ».
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* E-mail client */}
        <Tabs
          value={activeEmailVariant}
          onValueChange={(v) => setActiveEmailVariant(v as EmailVariant)}
          className="min-w-0 gap-0"
        >
          <Panel aria-labelledby="emails-client-heading" className="h-full">
            <PanelHeader
              id="emails-client-heading"
              icon={Mail}
              title="E-mail client"
              actions={
                <>
                  {clientBusy ? (
                    <StatusBadge tone="info" pulse>
                      En cours
                    </StatusBadge>
                  ) : null}
                  <AiGenerationInfoIcon
                    variant="positioning_generate"
                    modelsByTask={generationModelsByTask}
                    className="h-7 w-7"
                  />
                  {!isStreaming ? (
                    <Button type="button" variant="outline" size="sm" onClick={onGenerateEmails}>
                      {regenLabel}
                    </Button>
                  ) : null}
                </>
              }
            />
            <div className="border-b border-border px-4">
              <TabsList variant="line" aria-label="Variante de l’e-mail client" className="h-10 gap-4">
                <TabsTrigger value="full" className="flex-none px-0">
                  Complet
                </TabsTrigger>
                <TabsTrigger value="firstContact" className="flex-none px-0">
                  Premier contact
                </TabsTrigger>
                <TabsTrigger value="bulletPoints" className="flex-none px-0">
                  Points clés
                </TabsTrigger>
              </TabsList>
            </div>
            <PanelBody>
              {(Object.keys(variantContent) as EmailVariant[]).map((variant) => {
                const { value, set, title } = variantContent[variant];
                return (
                  <TabsContent key={variant} value={variant} className="focus-visible:outline-none">
                    {awaiting(value) ? (
                      <EmailSkeleton label={`Génération : ${title}`} />
                    ) : (
                      <EmailEditor email={value} onChange={set} readOnly={isStreaming} title={title} />
                    )}
                  </TabsContent>
                );
              })}
            </PanelBody>
          </Panel>
        </Tabs>

        {/* E-mail candidat */}
        <Panel aria-labelledby="emails-candidate-heading">
          <PanelHeader
            id="emails-candidate-heading"
            icon={Mail}
            title="E-mail candidat"
            description="Proposition de la mission au candidat."
            actions={
              busy('candidateEmail') ? (
                <StatusBadge tone="info" pulse>
                  En cours
                </StatusBadge>
              ) : undefined
            }
          />
          <PanelBody>
            {awaiting(candidateEmail) ? (
              <EmailSkeleton label="Génération : e-mail candidat" />
            ) : (
              <EmailEditor
                email={candidateEmail}
                onChange={setCandidateEmail}
                readOnly={isStreaming}
                title="E-mail de proposition au candidat"
              />
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
