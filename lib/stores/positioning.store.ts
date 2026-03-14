import { create } from 'zustand';
import type { ExtractedCV, PositioningAnalysis, PositioningEmail } from '@/lib/schema';

interface PositioningState {
  positioningId: string | null;
  jobDescription: string;
  analysis: Partial<PositioningAnalysis> | null;
  tailoredCv: Partial<ExtractedCV> | null;
  email: Partial<PositioningEmail> | null;
  currentStep: 1 | 2 | 3;
  isAnalyzing: boolean;
  isGenerating: boolean;
  pdfBlobUrl: string | null;
  isPdfLoading: boolean;

  setPositioningId: (id: string | null) => void;
  setJobDescription: (text: string) => void;
  setAnalysis: (data: Partial<PositioningAnalysis> | null) => void;
  setTailoredCv: (data: Partial<ExtractedCV> | null) => void;
  setEmail: (data: Partial<PositioningEmail> | null) => void;
  setCurrentStep: (step: 1 | 2 | 3) => void;
  setIsAnalyzing: (v: boolean) => void;
  setIsGenerating: (v: boolean) => void;
  setPdfBlobUrl: (url: string | null) => void;
  setIsPdfLoading: (loading: boolean) => void;
  updateAnswer: (type: 'candidate' | 'client', index: number, answer: string) => void;
  updateTailoredCvField: (field: keyof ExtractedCV, value: unknown) => void;
  reset: () => void;
}

const initialState = {
  positioningId: null,
  jobDescription: '',
  analysis: null,
  tailoredCv: null,
  email: null,
  currentStep: 1 as const,
  isAnalyzing: false,
  isGenerating: false,
  pdfBlobUrl: null,
  isPdfLoading: false,
};

export const usePositioningStore = create<PositioningState>((set, get) => ({
  ...initialState,

  setPositioningId: (id) => set({ positioningId: id }),
  setJobDescription: (text) => set({ jobDescription: text }),
  setAnalysis: (data) => set({ analysis: data }),
  setTailoredCv: (data) => set({ tailoredCv: data }),
  setEmail: (data) => set({ email: data }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setPdfBlobUrl: (url) => {
    const prev = get().pdfBlobUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ pdfBlobUrl: url });
  },
  setIsPdfLoading: (loading) => set({ isPdfLoading: loading }),

  updateAnswer: (type, index, answer) => {
    const analysis = get().analysis;
    if (!analysis) return;

    const key = type === 'candidate' ? 'candidateQuestions' : 'clientQuestions';
    const questions = [...(analysis[key] ?? [])];
    if (questions[index]) {
      questions[index] = { ...questions[index], answer };
    }
    set({ analysis: { ...analysis, [key]: questions } });
  },

  updateTailoredCvField: (field, value) => {
    const current = get().tailoredCv;
    if (!current) return;
    set({ tailoredCv: { ...current, [field]: value } });
  },

  reset: () => {
    const prev = get().pdfBlobUrl;
    if (prev) URL.revokeObjectURL(prev);
    set(initialState);
  },
}));
