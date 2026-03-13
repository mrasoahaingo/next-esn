'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, CheckCircle, FileText, Loader2 } from 'lucide-react';

export default function ExportPage() {
  const params = useParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: params.id }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const data = await res.json();
      setDownloadUrl(data.formatted_file_url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-shell text-white">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="mx-auto bg-neon/20 w-24 h-24 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-neon" />
        </div>

        <div>
          <h1 className="text-3xl font-bold title-gradient mb-2">Prêt à exporter</h1>
          <p className="text-slate-400">Les données du candidat ont été validées et sont prêtes pour l&apos;export PDF Himeo.</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl">
          {!downloadUrl ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-3 bg-neon text-black px-8 py-4 rounded-xl hover:bg-neon/90 disabled:opacity-50 transition-all font-semibold text-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileText className="w-6 h-6" />
                  Générer le PDF Himeo
                </>
              )}
            </button>
          ) : (
            <div className="space-y-6">
              <div className="bg-neon/10 text-neon p-4 rounded-xl flex items-center justify-center border border-neon/25">
                <CheckCircle className="w-5 h-5 mr-2" />
                Document généré avec succès !
              </div>
              <a
                href={downloadUrl}
                download
                className="w-full flex items-center justify-center gap-3 bg-neon text-black px-8 py-4 rounded-xl hover:bg-neon/90 transition-all font-semibold text-lg"
              >
                <Download className="w-6 h-6" />
                Télécharger le PDF
              </a>
              <button
                onClick={() => window.location.reload()}
                className="text-slate-400 hover:text-slate-300 text-sm hover:underline"
              >
                Générer à nouveau
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
