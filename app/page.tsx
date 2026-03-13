'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2 } from 'lucide-react';

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      router.push(`/review/${data.id}`);
    } catch (error) {
      console.error(error);
      setIsUploading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-blue-900 mb-8">Himeo CV Automation</h1>
        
        <div className="w-full max-w-xl p-12 bg-white rounded-xl shadow-lg border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors relative">
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.docx,.doc"
            disabled={isUploading}
          />
          <div className="flex flex-col items-center gap-4 text-center">
            {isUploading ? (
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            ) : (
              <Upload className="w-16 h-16 text-blue-600" />
            )}
            <p className="text-xl font-semibold text-gray-700">
              {isUploading ? 'Uploading...' : 'Drop CV here or click to upload'}
            </p>
            <p className="text-sm text-gray-500">Supports PDF, DOCX</p>
          </div>
        </div>
      </div>
    </main>
  );
}
