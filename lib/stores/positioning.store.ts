import { create } from 'zustand';
import type { ExtractedCV, PositioningAnalysis, PositioningEmail } from '@/lib/schema';
import type { PositioningRecruiterAnswerEntry } from '@/lib/services/positioning.service';

interface PositioningState {
  positioningId: string | null;
  jobDescription: string;
  analysis: Partial<PositioningAnalysis> | null;
  tailoredCv: Partial<ExtractedCV> | null;
  email: Partial<PositioningEmail> | null;
  emailFirstContact: Partial<PositioningEmail> | null;
  emailBulletPoints: Partial<PositioningEmail> | null;
  candidateEmail: Partial<PositioningEmail> | null;
  currentStep: 1 | 2 | 3;
  isAnalyzing: boolean;
  isGenerating: boolean;
  pdfBlobUrl: string | null;
  isPdfLoading: boolean;
  originalPdfBlobUrl: string | null;
  /**
   * Historique recruteur par clé `candidat:…` / `client:…` (append-only côté affinage ;
   * suppression d’une entrée depuis l’onglet Résultats).
   */
  recruiterAnswerEntries: Record<string, PositioningRecruiterAnswerEntry[]>;

  setPositioningId: (id: string | null) => void;
  setJobDescription: (text: string) => void;
  setAnalysis: (data: Partial<PositioningAnalysis> | null) => void;
  setTailoredCv: (data: Partial<ExtractedCV> | null) => void;
  setEmail: (data: Partial<PositioningEmail> | null) => void;
  setEmailFirstContact: (data: Partial<PositioningEmail> | null) => void;
  setEmailBulletPoints: (data: Partial<PositioningEmail> | null) => void;
  setCandidateEmail: (data: Partial<PositioningEmail> | null) => void;
  setCurrentStep: (step: 1 | 2 | 3) => void;
  setIsAnalyzing: (v: boolean) => void;
  setIsGenerating: (v: boolean) => void;
  setPdfBlobUrl: (url: string | null) => void;
  setIsPdfLoading: (loading: boolean) => void;
  setOriginalPdfBlobUrl: (url: string | null) => void;
  updateTailoredCvField: (field: keyof ExtractedCV, value: unknown) => void;
  setRecruiterAnswerEntries: (v: Record<string, PositioningRecruiterAnswerEntry[]>) => void;
  appendRecruiterAnswer: (key: string, text: string) => void;
  removeRecruiterAnswerEntry: (key: string, entryId: string) => void;
  reset: () => void;
}

const initialState = {
  positioningId: null,
  jobDescription: '',
  analysis: null,
  tailoredCv: null,
  email: null,
  emailFirstContact: null,
  emailBulletPoints: null,
  candidateEmail: null,
  currentStep: 1 as const,
  isAnalyzing: false,
  isGenerating: false,
  pdfBlobUrl: null,
  isPdfLoading: false,
  originalPdfBlobUrl: null,
  recruiterAnswerEntries: {} as Record<string, PositioningRecruiterAnswerEntry[]>,
};

export const usePositioningStore = create<PositioningState>((set, get) => ({
  ...initialState,

  setPositioningId: (id) => set({ positioningId: id }),
  setJobDescription: (text) => set({ jobDescription: text }),
  setAnalysis: (data) => set({ analysis: data }),
  setTailoredCv: (data) => set({ tailoredCv: data }),
  setEmail: (data) => set({ email: data }),
  setEmailFirstContact: (data) => set({ emailFirstContact: data }),
  setEmailBulletPoints: (data) => set({ emailBulletPoints: data }),
  setCandidateEmail: (data) => set({ candidateEmail: data }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setPdfBlobUrl: (url) => {
    const prev = get().pdfBlobUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ pdfBlobUrl: url });
  },
  setIsPdfLoading: (loading) => set({ isPdfLoading: loading }),
  setOriginalPdfBlobUrl: (url) => {
    const prev = get().originalPdfBlobUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ originalPdfBlobUrl: url });
  },

  updateTailoredCvField: (field, value) => {
    const current = get().tailoredCv;
    if (!current) return;
    set({ tailoredCv: { ...current, [field]: value } });
  },

  setRecruiterAnswerEntries: (v) => set({ recruiterAnswerEntries: v }),

  appendRecruiterAnswer: (key, text) => {
    const t = text.trim();
    if (!t) return;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    set((s) => {
      const prev = s.recruiterAnswerEntries[key] ?? [];
      return {
        recruiterAnswerEntries: {
          ...s.recruiterAnswerEntries,
          [key]: [...prev, { id, text: t, createdAt }],
        },
      };
    });
  },

  removeRecruiterAnswerEntry: (key, entryId) =>
    set((s) => {
      const prev = s.recruiterAnswerEntries[key] ?? [];
      const next = prev.filter((e) => e.id !== entryId);
      const nextMap = { ...s.recruiterAnswerEntries };
      if (next.length === 0) delete nextMap[key];
      else nextMap[key] = next;
      return { recruiterAnswerEntries: nextMap };
    }),

  reset: () => {
    const prev = get().pdfBlobUrl;
    if (prev) URL.revokeObjectURL(prev);
    const prevOriginal = get().originalPdfBlobUrl;
    if (prevOriginal) URL.revokeObjectURL(prevOriginal);
    set(initialState);
  },
}));
