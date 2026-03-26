'use client';

import { useState } from 'react';
import type { PositioningGenerateStreamMeta } from '@/lib/types/positioning-generate-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, RefreshCw, Mail, UserCheck, List, ClipboardCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import { TailoredCvForm } from './TailoredCvForm';

const EmailEditor = dynamic(
  () => import('./EmailEditor').then((m) => m.EmailEditor),
  { loading: () => <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet" /></div> },
);

type EmailVariant = 'full' | 'firstContact' | 'bulletPoints';

const GENERATION_BRANCH_ORDER = [
  'expertiseConfirmations',
  'tailoredCv',
  'email',
  'emailFirstContact',
  'emailBulletPoints',
  'candidateEmail',
] as const;

const GENERATION_BRANCH_LABELS: Record<(typeof GENERATION_BRANCH_ORDER)[number], string> = {
  expertiseConfirmations: 'Confirmations expertise',
  tailoredCv: 'CV retravaillé',
  email: 'Email client (complet)',
  emailFirstContact: 'Premier contact',
  emailBulletPoints: 'Bullet points',
  candidateEmail: 'Email candidat',
};

interface GenerationStepProps {
  isStreaming: boolean;
  streamMeta?: PositioningGenerateStreamMeta | null;
  onGenerate: () => void;
}

export function GenerationStep({ isStreaming, streamMeta, onGenerate }: GenerationStepProps) {
  const {
    tailoredCv,
    email,
    emailFirstContact,
    emailBulletPoints,
    candidateEmail,
    setEmail,
    setEmailFirstContact,
    setEmailBulletPoints,
    setCandidateEmail,
    updateTailoredCvField,
    generationExpertisePrompts,
    generationExpertiseResponses,
    setGenerationExpertiseResponse,
  } = usePositioningStore();

  const [activeTab, setActiveTab] = useState<'email' | 'candidateEmail' | 'cv'>('email');
  const [activeEmailVariant, setActiveEmailVariant] = useState<EmailVariant>('full');

  const hasExpertisePrompts = (generationExpertisePrompts?.length ?? 0) > 0;
  const hasGenerated =
    !!tailoredCv ||
    !!email ||
    !!emailFirstContact ||
    !!emailBulletPoints ||
    !!candidateEmail ||
    hasExpertisePrompts;
  const activeBranches = streamMeta?.activeBranches ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground text-center max-w-xl mx-auto leading-relaxed">
        Les <strong className="text-foreground font-medium">confirmations d&apos;expertise</strong> ci-dessous
        sont à remplir par le recruteur (suggestions uniquement). Elles ne modifient pas directement le
        formulaire CV : elles sont prises en compte dans le prompt lorsque vous cliquez sur{' '}
        <strong className="text-foreground font-medium">Générer à nouveau</strong>.
      </p>

      {/* Generate / Re-generate button */}
      {!isStreaming && (
        <div className="flex justify-center">
          <Button
            onClick={onGenerate}
            size="lg"
            variant={hasGenerated ? 'outline' : 'default'}
          >
            {hasGenerated ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Générer à nouveau
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Générer le positionnement
              </>
            )}
          </Button>
        </div>
      )}

      {/* Confirmations expertise — hors édition CV */}
      {hasExpertisePrompts && (
        <section className="glass-panel rounded-2xl p-5 border border-neon/15 space-y-4">
          <div className="flex items-center gap-2 border-b border-overlay/10 pb-3">
            <ClipboardCheck className="h-4 w-4 text-neon shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">
              Confirmer l&apos;expertise candidat
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Cliquez sur une suggestion pour la copier dans le champ (vous pouvez l&apos;ajuster). Une fois
            les réponses renseignées, relancez la génération pour les intégrer aux emails et au CV retravaillé.
          </p>
          <div className="space-y-5">
            {generationExpertisePrompts!.map((item) => {
              const id = item.id ?? '';
              const value = generationExpertiseResponses[id] ?? '';
              return (
                <div key={id || item.question} className="space-y-2 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-foreground">{item.question}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.context}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-full mb-0.5">
                      Suggestions de réponses
                    </span>
                    {item.suggestedAnswers.map((s, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer font-normal text-xs py-1 px-2 border-neon/25 hover:bg-neon/10 hover:border-neon/40"
                        onClick={() => setGenerationExpertiseResponse(id, s)}
                      >
                        {s.length > 120 ? `${s.slice(0, 117)}…` : s}
                      </Badge>
                    ))}
                  </div>
                  <Textarea
                    value={value}
                    onChange={(e) => setGenerationExpertiseResponse(id, e.target.value)}
                    placeholder="Réponse retenue (libre ou issue d’une suggestion)…"
                    className="min-h-[72px] text-sm"
                    readOnly={isStreaming}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Loading state before content arrives */}
      {isStreaming &&
        !tailoredCv &&
        !email &&
        !emailFirstContact &&
        !emailBulletPoints &&
        !candidateEmail &&
        !hasExpertisePrompts && (
        <section className="glass-panel rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-overlay/[0.06] to-transparent animate-shimmer" />
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="h-12 w-12 rounded-xl bg-violet/20 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-violet" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-violet" />
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Génération en cours...</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Six blocs sont produits en parallèle : questions de confirmation d&apos;expertise (suggestions),
                CV retravaillé et quatre variantes d&apos;emails (les onglets se rempliront au fil du stream).
              </p>
            </div>
            <ul className="mt-2 flex w-full max-w-md flex-col gap-2 text-left">
              {GENERATION_BRANCH_ORDER.map((branch) => {
                const busy = activeBranches.includes(branch);
                return (
                  <li
                    key={branch}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      busy
                        ? 'border-violet/40 bg-violet/10 text-violet'
                        : 'border-overlay/10 bg-overlay/[0.02] text-muted-foreground'
                    }`}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                    )}
                    <span className={busy ? 'font-medium' : ''}>{GENERATION_BRANCH_LABELS[branch]}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Content tabs */}
      {(tailoredCv || email || emailFirstContact || emailBulletPoints || candidateEmail) && (
        <>
          {isStreaming && (
            <div className="flex flex-col gap-2 px-3 py-2 rounded-lg bg-violet/10 border border-violet/20">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet" />
                </span>
                <span className="text-xs font-medium text-violet">Génération en cours...</span>
              </div>
              {activeBranches.length > 0 && (
                <p className="text-[11px] text-muted-foreground pl-4">
                  En cours :{' '}
                  {activeBranches.map((b) => GENERATION_BRANCH_LABELS[b]).join(' · ')}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={activeTab === 'email' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('email')}
              className={
                activeTab === 'email'
                  ? 'border-violet/30 bg-violet/15 text-violet'
                  : 'border-border bg-overlay/[0.04] text-muted-foreground hover:bg-overlay/[0.08]'
              }
            >
              Email client
            </Button>
            <Button
              type="button"
              variant={activeTab === 'candidateEmail' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('candidateEmail')}
              className={
                activeTab === 'candidateEmail'
                  ? 'border-neon/30 bg-neon/15 text-neon'
                  : 'border-border bg-overlay/[0.04] text-muted-foreground hover:bg-overlay/[0.08]'
              }
            >
              Email candidat
            </Button>
            <Button
              type="button"
              variant={activeTab === 'cv' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('cv')}
              className={
                activeTab === 'cv'
                  ? 'border-violet/30 bg-violet/15 text-violet'
                  : 'border-border bg-overlay/[0.04] text-muted-foreground hover:bg-overlay/[0.08]'
              }
            >
              CV retravaillé
            </Button>
          </div>

          {activeTab === 'email' && (
            <div className="flex flex-col gap-3">
              <Tabs
                value={activeEmailVariant}
                onValueChange={(v) => setActiveEmailVariant(v as EmailVariant)}
                className="flex flex-col gap-3"
              >
                <TabsList variant="segmented" className="grid w-full grid-cols-3">
                  <TabsTrigger value="full">
                    <Mail className="h-3 w-3" />
                    Complet
                  </TabsTrigger>
                  <TabsTrigger value="firstContact">
                    <UserCheck className="h-3 w-3" />
                    Premier contact
                  </TabsTrigger>
                  <TabsTrigger value="bulletPoints">
                    <List className="h-3 w-3" />
                    Bullet points
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
          )}

          {activeTab === 'candidateEmail' && (
            <EmailEditor
              email={candidateEmail}
              onChange={setCandidateEmail}
              readOnly={isStreaming}
              title="Email de proposition au candidat"
            />
          )}

          {activeTab === 'cv' && (
            <TailoredCvForm
              data={tailoredCv}
              onUpdateField={updateTailoredCvField}
              readOnly={isStreaming}
            />
          )}
        </>
      )}
    </div>
  );
}
