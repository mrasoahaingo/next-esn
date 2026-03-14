'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Search, Loader2, Target } from 'lucide-react';

export default function PositioningNewPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params?.id as string;

  const [jobDescription, setJobDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!jobDescription.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/positioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, jobDescription }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/review/${candidateId}/positioning/${data.id}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-full bg-background text-foreground overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push(`/review/${candidateId}`)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour au CV
          </Button>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet/20 text-violet">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold title-gradient">Nouveau positionnement</h1>
              <p className="text-sm text-muted-foreground">Collez la fiche de poste pour lancer l&apos;analyse</p>
            </div>
          </div>

          <Textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Collez ici la fiche de poste..."
            className="min-h-[400px] text-sm mb-6"
            disabled={isCreating}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={!jobDescription.trim() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Analyser le matching
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
