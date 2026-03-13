'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { experimental_useObject as useObject } from 'ai/react';
import { extractionSchema } from '@/lib/schema';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  
  const { object, submit, isLoading, error } = useObject({
    api: '/api/extract',
    schema: extractionSchema,
  });

  useEffect(() => {
    if (params?.id) {
      fetch(`/api/candidates/${params.id}`)
        .then(res => res.json())
        .then(data => {
          setCandidate(data);
          // If not extracted yet, start extraction
          if (data.status === 'uploaded' || data.status === 'extracting') {
             // Only submit if we don't have object yet and not loading
             // But useEffect runs once.
             submit({ candidateId: params.id });
          }
        });
    }
  }, []); // Run once on mount

  const currentData = object || candidate?.extracted_data;

  const handleSave = async () => {
      if (!currentData) return;
      await fetch(`/api/candidates/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extracted_data: currentData, status: 'ready' }),
      });
      router.push(`/export/${params.id}`);
  };

  if (!candidate) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /> Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review Candidate</h1>
            <p className="text-gray-500">Review and edit the extracted information</p>
          </div>
          <div className="flex gap-4">
             {isLoading && <span className="flex items-center text-blue-600"><Loader2 className="animate-spin mr-2"/> AI Extracting...</span>}
             <button 
                onClick={handleSave}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center shadow-sm"
                disabled={isLoading || !currentData}
            >
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider & Continuer
            </button>
          </div>
        </div>

        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error.message}
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left Column: Personal & Summary */}
           <div className="space-y-6 lg:col-span-1">
              <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Personal Info</h2>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Name</label>
                          <div className="font-medium text-lg">{currentData?.personalInfo?.firstName} {currentData?.personalInfo?.lastName}</div>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Title</label>
                          <div className="text-gray-700">{currentData?.personalInfo?.title}</div>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
                          <div className="text-gray-700">{currentData?.personalInfo?.email}</div>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Location</label>
                          <div className="text-gray-700">{currentData?.personalInfo?.location}</div>
                      </div>
                  </div>
              </section>

              <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                      {currentData?.skills?.map((skill: string, i: number) => (
                          <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                              {skill}
                          </span>
                      ))}
                  </div>
              </section>

               <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Strengths</h2>
                   <ul className="space-y-2">
                      {currentData?.strengths?.map((strength: string, i: number) => (
                          <li key={i} className="flex items-start text-sm text-gray-700">
                              <span className="mr-2 text-green-500 mt-1">•</span>
                              {strength}
                          </li>
                      ))}
                  </ul>
              </section>
           </div>

           {/* Right Column: Experience & Education */}
           <div className="space-y-6 lg:col-span-2">
              <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Professional Summary</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData?.summary}</p>
              </section>

              <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Experiences</h2>
                  <div className="space-y-8">
                      {currentData?.experiences?.map((exp: any, i: number) => (
                          <div key={i} className="relative pl-4 border-l-2 border-gray-200 hover:border-blue-400 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                  <h3 className="font-bold text-gray-900 text-lg">{exp.role}</h3>
                                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {exp.startDate} - {exp.endDate || 'Present'}
                                  </span>
                              </div>
                              <div className="text-blue-600 font-medium mb-2">{exp.company} {exp.location && `• ${exp.location}`}</div>
                              <ul className="space-y-1">
                                  {exp.description?.map((desc: string, j: number) => (
                                      <li key={j} className="text-gray-700 text-sm flex items-start">
                                          <span className="mr-2 text-gray-400">•</span>
                                          {desc}
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      ))}
                  </div>
              </section>

              <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Education</h2>
                  <div className="space-y-4">
                      {currentData?.education?.map((edu: any, i: number) => (
                          <div key={i} className="flex justify-between items-center">
                              <div>
                                  <div className="font-bold text-gray-900">{edu.degree}</div>
                                  <div className="text-gray-600">{edu.school}</div>
                              </div>
                              <div className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">{edu.year}</div>
                          </div>
                      ))}
                  </div>
              </section>
           </div>
        </div>
      </div>
    </div>
  );
}
