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
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="mx-auto bg-green-100 w-24 h-24 rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ready to Export</h1>
            <p className="text-gray-500">The candidate data has been validated and is ready for Himeo template generation.</p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            {!downloadUrl ? (
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-semibold text-lg shadow-md hover:shadow-lg transform active:scale-95 duration-200"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <FileText className="w-6 h-6" />
                            Generate Himeo DOCX
                        </>
                    )}
                </button>
            ) : (
                <div className="space-y-6">
                    <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center justify-center border border-green-100">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Document generated successfully!
                    </div>
                    <a
                        href={downloadUrl}
                        download
                        className="w-full flex items-center justify-center gap-3 bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition-all font-semibold text-lg shadow-md hover:shadow-lg transform active:scale-95 duration-200"
                    >
                        <Download className="w-6 h-6" />
                        Download .docx
                    </a>
                    <button 
                        onClick={() => window.location.reload()}
                        className="text-gray-400 hover:text-gray-600 text-sm hover:underline"
                    >
                        Generate again
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
