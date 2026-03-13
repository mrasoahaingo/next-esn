import { create } from 'zustand';
import type { ExtractedCV } from '@/lib/schema';

interface CvBuilderState {
  cvData: Partial<ExtractedCV> | null;
  isStreaming: boolean;
  pdfBlobUrl: string | null;
  isPdfLoading: boolean;
  setCvData: (data: Partial<ExtractedCV> | null) => void;
  updateField: (field: keyof ExtractedCV, value: unknown) => void;
  setStreaming: (streaming: boolean) => void;
  setPdfBlobUrl: (url: string | null) => void;
  setIsPdfLoading: (loading: boolean) => void;
}

export const useCvBuilderStore = create<CvBuilderState>((set, get) => ({
  cvData: null,
  isStreaming: false,
  pdfBlobUrl: null,
  isPdfLoading: false,
  setCvData: (data) => set({ cvData: data }),
  updateField: (field, value) => {
    const current = get().cvData;
    if (!current) return;
    set({ cvData: { ...current, [field]: value } });
  },
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setPdfBlobUrl: (url) => {
    const prev = get().pdfBlobUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ pdfBlobUrl: url });
  },
  setIsPdfLoading: (loading) => set({ isPdfLoading: loading }),
}));
