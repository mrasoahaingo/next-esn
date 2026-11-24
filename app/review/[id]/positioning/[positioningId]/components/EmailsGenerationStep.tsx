'use client';

import { useState } from 'react';
import type { PositioningGenerateStreamMeta } from '@/lib/types/positioning-generate-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';

function EmailSkeleton({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      aria-busy="true"
      aria-label={label}
    >
      <Skeleton className="h-4 w-1/3 animate-none" />
      <Skeleton className="h-8 w-full animate-none" />
      <Skeleton className="h-3 w-5/6 animate-none" />
      <Skeleton className="h-3 w-2/3 animate-none" />
      <Skeleton className="h-3 w-3/4 animate-none" />
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

function ColumnHeading({ id, children, hint }: { id: string; children: React.ReactNode; hint?: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
      <h3 id={id} className="text-[0.9375rem] font-semibold text-foreground">
        {children}
      </h3>
      {hint ? (
        <span className="border-l-2 border-primary pl-2 text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

/**
 * Étape 2 : les e-mails client (trois variantes en liens-onglets) et candidat, en deux
 * colonnes sur le papier. Pendant la génération, des squelettes à la forme des colonnes ;
 * l'état du flux est dans la zone `status` de l'en-tête, pas ici.
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-2">
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="text-[0.9375rem] font-semibold text-foreground">E-mails</h2>
          <AiGenerationInfoIcon
            variant="positioning_generate"
            modelsByTask={generationModelsByTask}
            className="h-7 w-7"
          />
        </div>
        {!isStreaming ? (
          <Button type="button" variant="outline" size="sm" onClick={onGenerateEmails}>
            {regenLabel}
          </Button>
        ) : null}
      </div>

      {cvOnlyRun && !hasEmails ? (
        <p className="text-sm text-muted-foreground">
          Cette exécution ne régénère que le CV : ouvrez l’étape « CV retravaillé ».
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        {/* Colonne Client */}
        <section aria-labelledby="emails-client-heading" className="flex min-w-0 flex-col gap-4">
          <ColumnHeading id="emails-client-heading" hint={busy(variantContent[activeEmailVariant].branch) ? 'En cours' : null}>
            Client
          </ColumnHeading>
          <Tabs
            value={activeEmailVariant}
            onValueChange={(v) => setActiveEmailVariant(v as EmailVariant)}
            className="gap-4"
          >
            <TabsList variant="line" aria-label="Variante de l’e-mail client">
              <TabsTrigger value="full" className="flex-none px-1">
                Complet
              </TabsTrigger>
              <TabsTrigger value="firstContact" className="flex-none px-1">
                Premier contact
              </TabsTrigger>
              <TabsTrigger value="bulletPoints" className="flex-none px-1">
                Points clés
              </TabsTrigger>
            </TabsList>
            {(Object.keys(variantContent) as EmailVariant[]).map((variant) => {
              const { value, set, title } = variantContent[variant];
              return (
                <TabsContent key={variant} value={variant} className="mt-0 focus-visible:outline-none">
                  {awaiting(value) ? (
                    <EmailSkeleton label={`Génération : ${title}`} />
                  ) : (
                    <EmailEditor email={value} onChange={set} readOnly={isStreaming} title={title} />
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </section>

        {/* Colonne Candidat */}
        <section aria-labelledby="emails-candidate-heading" className="flex min-w-0 flex-col gap-4">
          <ColumnHeading id="emails-candidate-heading" hint={busy('candidateEmail') ? 'En cours' : null}>
            Candidat
          </ColumnHeading>
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
        </section>
      </div>
    </div>
  );
}
