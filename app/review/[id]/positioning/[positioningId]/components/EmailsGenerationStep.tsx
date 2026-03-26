'use client';

import { useMemo, useState } from 'react';
import type { PositioningGenerateStreamMeta } from '@/lib/types/positioning-generate-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, Mail, UserCheck, List, Building2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const EmailEditor = dynamic(
  () => import('./EmailEditor').then((m) => m.EmailEditor),
  { loading: () => <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet" /></div> },
);

type EmailVariant = 'full' | 'firstContact' | 'bulletPoints';

const EMAIL_BRANCHES = ['email', 'emailFirstContact', 'emailBulletPoints', 'candidateEmail'] as const;

const EMAIL_BRANCH_LABELS: Record<(typeof EMAIL_BRANCHES)[number], string> = {
  email: 'Email client (complet)',
  emailFirstContact: 'Premier contact',
  emailBulletPoints: 'Bullet points',
  candidateEmail: 'Email candidat',
};

function RegenButton({
  onClick,
  disabled,
  hasContent,
}: {
  onClick: () => void;
  disabled: boolean;
  hasContent: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 text-violet hover:text-violet hover:bg-violet/10 h-7 px-2.5 text-xs"
    >
      <RefreshCw className="mr-1.5 h-3 w-3" />
      {hasContent ? 'Relancer' : 'Générer'}
    </Button>
  );
}

interface EmailsGenerationStepProps {
  isStreaming: boolean;
  streamMeta?: PositioningGenerateStreamMeta | null;
  onGenerateEmails: () => void;
}

export function EmailsGenerationStep({
  isStreaming,
  streamMeta,
  onGenerateEmails,
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

  const branchesForLoadingList = useMemo(() => {
    if (generateMode === 'cv') {
      return [];
    }
    return [...EMAIL_BRANCHES];
  }, [generateMode]);

  const streamingSummaryLine = useMemo(() => {
    if (generateMode === 'emails') {
      return 'Génération des propositions (client et candidat) en cours.';
    }
    return 'Génération en cours — les zones concernées affichent un indicateur.';
  }, [generateMode]);

  const busy = (branch: (typeof EMAIL_BRANCHES)[number]) => activeBranches.includes(branch);

  const showEmailsBlockProgressList =
    isStreaming &&
    !email &&
    !emailFirstContact &&
    !emailBulletPoints &&
    !candidateEmail &&
    (generateMode === 'emails' || generateMode === 'all' || generateMode === undefined);

  const showEmailsHeaderBusy =
    isStreaming &&
    (generateMode === 'emails' || generateMode === 'all' || generateMode === undefined);

  return (
    <div className="flex flex-col gap-6">
        <section className="rounded-xl border border-overlay/10 bg-overlay/[0.06] overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-3 border-b border-border/60">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">Propositions</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Propositions client (variantes) à gauche, proposition candidat à droite.
            </p>
          </div>
          {!isStreaming && (
            <RegenButton onClick={onGenerateEmails} disabled={isStreaming} hasContent={hasEmails} />
          )}
          {showEmailsHeaderBusy && (
            <div className="ml-2 flex items-center gap-1.5 text-xs text-violet shrink-0">
              <Loader2 className="h-3 w-3 animate-spin" />
              En cours…
            </div>
          )}
        </div>

        <div className="p-4">
          {isStreaming && generateMode === 'cv' ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Cette exécution ne régénère que le CV — ouvrez l&apos;étape « CV retravaillé ».
            </p>
          ) : showEmailsBlockProgressList ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet" />
              <p className="text-sm font-medium text-foreground">Génération des propositions...</p>
              <p className="text-xs text-muted-foreground max-w-md">{streamingSummaryLine}</p>
              <ul className="mt-2 flex w-full max-w-md flex-col gap-2 text-left">
                {branchesForLoadingList.map((branch) => {
                  const isBusy = busy(branch);
                  return (
                    <li
                      key={branch}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                        isBusy
                          ? 'border-violet/40 bg-violet/10 text-violet'
                          : 'border-overlay/10 bg-overlay/[0.02] text-muted-foreground'
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                      )}
                      <span className={isBusy ? 'font-medium' : ''}>{EMAIL_BRANCH_LABELS[branch]}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <>
              {isStreaming && (email || emailFirstContact || emailBulletPoints || candidateEmail) && (
                <div className="flex flex-col gap-2 px-3 py-2 rounded-lg bg-violet/10 border border-violet/20 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-violet" />
                    </span>
                    <span className="text-xs font-medium text-violet">Génération en cours...</span>
                  </div>
                  {activeBranches.filter((b) => b !== 'tailoredCv').length > 0 && (
                    <p className="text-[11px] text-muted-foreground pl-4">
                      En cours :{' '}
                      {activeBranches
                        .filter((b): b is (typeof EMAIL_BRANCHES)[number] =>
                          (EMAIL_BRANCHES as readonly string[]).includes(b),
                        )
                        .map((b) => EMAIL_BRANCH_LABELS[b])
                        .join(' · ')}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
                {/* Colonne Client */}
                <div className="flex flex-col gap-3 min-w-0 rounded-lg border border-border/50 bg-background/20 p-3">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    <Building2 className="h-4 w-4 text-violet shrink-0" />
                    <span className="text-sm font-semibold text-foreground">Client</span>
                  </div>
                  <Tabs
                    value={activeEmailVariant}
                    onValueChange={(v) => setActiveEmailVariant(v as EmailVariant)}
                    className="flex flex-col gap-3"
                  >
                    <TabsList variant="segmented" className="grid w-full grid-cols-3 h-auto py-1">
                      <TabsTrigger value="full" className="gap-1 text-[10px] px-1">
                        {busy('email') ? (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-violet" />
                        ) : (
                          <Mail className="h-3 w-3 opacity-70" />
                        )}
                        Complet
                      </TabsTrigger>
                      <TabsTrigger value="firstContact" className="gap-1 text-[10px] px-1">
                        {busy('emailFirstContact') ? (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-violet" />
                        ) : (
                          <UserCheck className="h-3 w-3 opacity-70" />
                        )}
                        1er contact
                      </TabsTrigger>
                      <TabsTrigger value="bulletPoints" className="gap-1 text-[10px] px-1">
                        {busy('emailBulletPoints') ? (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-violet" />
                        ) : (
                          <List className="h-3 w-3 opacity-70" />
                        )}
                        Bullets
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="full" className="mt-0 focus-visible:outline-none">
                      <EmailEditor
                        email={email}
                        onChange={setEmail}
                        readOnly={isStreaming}
                        title="Email complet de positionnement"
                      />
                    </TabsContent>
                    <TabsContent value="firstContact" className="mt-0 focus-visible:outline-none">
                      <EmailEditor
                        email={emailFirstContact}
                        onChange={setEmailFirstContact}
                        readOnly={isStreaming}
                        title="Email de première prise de contact"
                      />
                    </TabsContent>
                    <TabsContent value="bulletPoints" className="mt-0 focus-visible:outline-none">
                      <EmailEditor
                        email={emailBulletPoints}
                        onChange={setEmailBulletPoints}
                        readOnly={isStreaming}
                        title="Email en bullet points"
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Colonne Candidat */}
                <div className="flex flex-col gap-3 min-w-0 rounded-lg border border-border/50 bg-background/20 p-3">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    <UserCheck className="h-4 w-4 text-neon shrink-0" />
                    <span className="text-sm font-semibold text-foreground">Candidat</span>
                  </div>
                  {busy('candidateEmail') && (
                    <div className="flex items-center gap-2 text-xs text-violet">
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      Génération…
                    </div>
                  )}
                  <EmailEditor
                    email={candidateEmail}
                    onChange={setCandidateEmail}
                    readOnly={isStreaming}
                    title="Email de proposition au candidat"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
