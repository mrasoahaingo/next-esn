'use client';

import { useState } from 'react';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type BriefPersona = 'dsi' | 'drh' | 'ceo' | 'daf' | 'directeur_technique' | 'auto';
type BriefChannel = 'email_froid' | 'relance_linkedin' | 'appel' | 'relance_email' | 'auto';

const PERSONA_OPTIONS: { value: BriefPersona; label: string }[] = [
  { value: 'auto', label: 'Persona auto' },
  { value: 'dsi', label: 'DSI' },
  { value: 'drh', label: 'DRH' },
  { value: 'ceo', label: 'CEO' },
  { value: 'daf', label: 'DAF' },
  { value: 'directeur_technique', label: 'Directeur Technique' },
];

const CHANNEL_OPTIONS: { value: BriefChannel; label: string }[] = [
  { value: 'auto', label: 'Canal auto' },
  { value: 'email_froid', label: 'Email froid' },
  { value: 'relance_linkedin', label: 'Message LinkedIn' },
  { value: 'appel', label: 'Script appel' },
  { value: 'relance_email', label: 'Relance email' },
];

export function AiBrief({ companyId }: { companyId: string }) {
  const [persona, setPersona] = useState<BriefPersona>('auto');
  const [channel, setChannel] = useState<BriefChannel>('auto');

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/radar/brief',
      body: { companyId, persona, channel },
    }),
  });

  const text = messages
    .flatMap((message) => message.parts)
    .map((part) => ('text' in part ? part.text : ''))
    .join('\n')
    .trim();

  const isStreaming = status === 'submitted' || status === 'streaming';
  const hasContent = text.length > 0;

  function handleGenerate() {
    setMessages([]);
    sendMessage({ text: 'Génère le brief de prospection.' });
  }

  function handleRegenerate() {
    setMessages([]);
    sendMessage({ text: 'Génère le brief de prospection.' });
  }

  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
          Brief SDR
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <Select value={persona} onValueChange={(v) => setPersona(v as BriefPersona)}>
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERSONA_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channel} onValueChange={(v) => setChannel(v as BriefChannel)}>
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasContent || isStreaming ? (
          <>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm leading-relaxed">
              <div className="whitespace-pre-wrap">
                {text}
                {isStreaming ? (
                  <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-muted-foreground/70 align-middle" />
                ) : null}
              </div>
              {isStreaming ? (
                <p className="mt-3 text-xs text-muted-foreground">Génération en cours...</p>
              ) : null}
            </div>
            {!isStreaming ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRegenerate} className="text-xs">
                  Regénérer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(text);
                  }}
                >
                  Copier
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-center text-xs text-muted-foreground">
              Sélectionne le persona cible et le canal d&apos;approche, puis génère le brief.
            </p>
            <Button onClick={handleGenerate} disabled={isStreaming} size="sm">
              Générer le brief
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
