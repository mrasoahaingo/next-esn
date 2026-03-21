'use client';

import { useState } from 'react';
import type { PositioningGenerateStreamMeta } from '@/lib/types/positioning-generate-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RefreshCw, Mail, UserCheck, List } from 'lucide-react';
import dynamic from 'next/dynamic';
import { TailoredCvForm } from './TailoredCvForm';

const EmailEditor = dynamic(
  () => import('./EmailEditor').then((m) => m.EmailEditor),
  { loading: () => <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet" /></div> },
);

type EmailVariant = 'full' | 'firstContact' | 'bulletPoints';

const GENERATION_BRANCH_ORDER = [
  'tailoredCv',
  'email',
  'emailFirstContact',
  'emailBulletPoints',
  'candidateEmail',
] as const;

const GENERATION_BRANCH_LABELS: Record<(typeof GENERATION_BRANCH_ORDER)[number], string> = {
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
  } = usePositioningStore();

  const [activeTab, setActiveTab] = useState<'email' | 'candidateEmail' | 'cv'>('email');
  const [activeEmailVariant, setActiveEmailVariant] = useState<EmailVariant>('full');

  const hasGenerated = !!tailoredCv || !!email || !!emailFirstContact || !!emailBulletPoints || !!candidateEmail;
  const activeBranches = streamMeta?.activeBranches ?? [];

  return (
    <div className="space-y-4">
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

      {/* Loading state before content arrives */}
      {isStreaming &&
        !tailoredCv &&
        !email &&
        !emailFirstContact &&
        !emailBulletPoints &&
        !candidateEmail && (
        <section className="glass-panel rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
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
              <p className="text-sm font-medium text-white">Génération en cours...</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Cinq blocs sont produits en parallèle : CV retravaillé et quatre variantes d&apos;emails (les onglets se rempliront au fil du stream).
              </p>
            </div>
            <ul className="w-full max-w-md space-y-2 mt-2 text-left">
              {GENERATION_BRANCH_ORDER.map((branch) => {
                const busy = activeBranches.includes(branch);
                return (
                  <li
                    key={branch}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      busy
                        ? 'border-violet/40 bg-violet/10 text-violet'
                        : 'border-white/10 bg-white/[0.02] text-slate-500'
                    }`}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20" />
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
            <div className="space-y-2 px-3 py-2 rounded-lg bg-violet/10 border border-violet/20">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet" />
                </span>
                <span className="text-xs font-medium text-violet">Génération en cours...</span>
              </div>
              {activeBranches.length > 0 && (
                <p className="text-[11px] text-slate-400 pl-4">
                  En cours :{' '}
                  {activeBranches.map((b) => GENERATION_BRANCH_LABELS[b]).join(' · ')}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('email')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'email'
                  ? 'bg-violet/15 text-violet border border-violet/30'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              Email client
            </button>
            <button
              onClick={() => setActiveTab('candidateEmail')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'candidateEmail'
                  ? 'bg-neon/15 text-neon border border-neon/30'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              Email candidat
            </button>
            <button
              onClick={() => setActiveTab('cv')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'cv'
                  ? 'bg-violet/15 text-violet border border-violet/30'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              CV retravaillé
            </button>
          </div>

          {activeTab === 'email' && (
            <div className="space-y-3">
              {/* Email variant sub-tabs */}
              <div className="flex gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
                <button
                  onClick={() => setActiveEmailVariant('full')}
                  className={`flex items-center gap-1.5 flex-1 justify-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeEmailVariant === 'full'
                      ? 'bg-violet/20 text-violet border border-violet/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Mail className="h-3 w-3" />
                  Complet
                </button>
                <button
                  onClick={() => setActiveEmailVariant('firstContact')}
                  className={`flex items-center gap-1.5 flex-1 justify-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeEmailVariant === 'firstContact'
                      ? 'bg-violet/20 text-violet border border-violet/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <UserCheck className="h-3 w-3" />
                  Première contact
                </button>
                <button
                  onClick={() => setActiveEmailVariant('bulletPoints')}
                  className={`flex items-center gap-1.5 flex-1 justify-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeEmailVariant === 'bulletPoints'
                      ? 'bg-violet/20 text-violet border border-violet/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <List className="h-3 w-3" />
                  Bullet points
                </button>
              </div>

              {activeEmailVariant === 'full' && (
                <EmailEditor
                  email={email}
                  onChange={setEmail}
                  readOnly={isStreaming}
                  title="Email complet de positionnement"
                />
              )}
              {activeEmailVariant === 'firstContact' && (
                <EmailEditor
                  email={emailFirstContact}
                  onChange={setEmailFirstContact}
                  readOnly={isStreaming}
                  title="Email de première prise de contact"
                />
              )}
              {activeEmailVariant === 'bulletPoints' && (
                <EmailEditor
                  email={emailBulletPoints}
                  onChange={setEmailBulletPoints}
                  readOnly={isStreaming}
                  title="Email en bullet points"
                />
              )}
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
