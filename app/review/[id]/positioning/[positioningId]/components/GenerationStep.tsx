'use client';

import { useState, useCallback } from 'react';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { EmailEditor } from './EmailEditor';
import { TailoredCvForm } from './TailoredCvForm';

interface GenerationStepProps {
  positioningId: string;
  isStreaming: boolean;
  onGenerate: () => void;
}

export function GenerationStep({ positioningId, isStreaming, onGenerate }: GenerationStepProps) {
  const {
    tailoredCv,
    email,
    candidateEmail,
    isGenerating,
    setEmail,
    setCandidateEmail,
    updateTailoredCvField,
  } = usePositioningStore();

  const [activeTab, setActiveTab] = useState<'email' | 'candidateEmail' | 'cv'>('email');

  const hasGenerated = !!tailoredCv || !!email || !!candidateEmail;

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
      {isStreaming && !tailoredCv && !email && (
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
              <p className="text-xs text-slate-400 mt-1">L&apos;IA retravaille le CV et rédige l&apos;email de positionnement</p>
            </div>
            <div className="w-full max-w-xs space-y-3 mt-2">
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-violet/40 animate-pulse" style={{ width: '60%' }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>CV retravaillé</span>
                <span>Email</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Content tabs */}
      {(tailoredCv || email) && (
        <>
          {isStreaming && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet/10 border border-violet/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet" />
              </span>
              <span className="text-xs font-medium text-violet">Génération en cours...</span>
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
            <EmailEditor
              email={email}
              onChange={setEmail}
              readOnly={isStreaming}
              title="Email de positionnement client"
            />
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
