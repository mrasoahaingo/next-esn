import { create } from 'zustand';
import type { ExtractedCV } from '@/lib/schema';
import { sanitizeExtractedCv } from '@/lib/utils/cv-sanitize';

interface CvBuilderState {
  cvData: Partial<ExtractedCV> | null;
  pdfBlobUrl: string | null;
  pdfPageCount: number;
  isPdfLoading: boolean;
  isDirty: boolean;
  setCvData: (data: Partial<ExtractedCV> | null) => void;
  updateField: (field: keyof ExtractedCV, value: unknown) => void;
  setPdfBlobUrl: (url: string | null) => void;
  setPdfPageCount: (count: number) => void;
  setIsPdfLoading: (loading: boolean) => void;
  setDirty: (dirty: boolean) => void;
}

export const useCvBuilderStore = create<CvBuilderState>((set, get) => ({
  cvData: null,
  pdfBlobUrl: null,
  pdfPageCount: 1,
  isPdfLoading: false,
  isDirty: false,
  // Chargement / streaming : CV normalisé (l'autosave réécrit la version propre en base).
  setCvData: (data) => set({ cvData: data ? sanitizeExtractedCv(data) : null }),
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
  setPdfPageCount: (count) => set({ pdfPageCount: count }),
  setIsPdfLoading: (loading) => set({ isPdfLoading: loading }),
  setDirty: (dirty) => set({ isDirty: dirty }),
}));
