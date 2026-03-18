import { create } from 'zustand';
import type { ExtractedCV } from '@/lib/schema';

interface CvBuilderState {
  cvData: Partial<ExtractedCV> | null;
  pdfBlobUrl: string | null;
  isPdfLoading: boolean;
  isDirty: boolean;
  setCvData: (data: Partial<ExtractedCV> | null) => void;
  updateField: (field: keyof ExtractedCV, value: unknown) => void;
  setPdfBlobUrl: (url: string | null) => void;
  setIsPdfLoading: (loading: boolean) => void;
  setDirty: (dirty: boolean) => void;
}

export const useCvBuilderStore = create<CvBuilderState>((set, get) => ({
  cvData: null,
  pdfBlobUrl: null,
  isPdfLoading: false,
  isDirty: false,
  setCvData: (data) => set({ cvData: data }),
  updateField: (field, value) => {
    const current = get().cvData;
    if (!current) return;
    set({ cvData: { ...current, [field]: value }, isDirty: true });
  },
  setPdfBlobUrl: (url) => {
    const prev = get().pdfBlobUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ pdfBlobUrl: url });
  },
  setIsPdfLoading: (loading) => set({ isPdfLoading: loading }),
  setDirty: (dirty) => set({ isDirty: dirty }),
}));
