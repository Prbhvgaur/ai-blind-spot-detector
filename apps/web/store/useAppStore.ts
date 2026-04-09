import type { PublicAnalysis } from "@blindspot/shared";
import { create } from "zustand";

type AnalysisStage = "idle" | "queued" | "processing" | "complete" | "failed";

interface AppState {
  currentAnalysis: PublicAnalysis | null;
  currentAnalysisId: string | null;
  stage: AnalysisStage;
  setCurrentAnalysis: (analysis: PublicAnalysis | null) => void;
  setCurrentAnalysisId: (analysisId: string | null) => void;
  setStage: (stage: AnalysisStage) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentAnalysis: null,
  currentAnalysisId: null,
  stage: "idle",
  setCurrentAnalysis: (currentAnalysis) => set({ currentAnalysis }),
  setCurrentAnalysisId: (currentAnalysisId) => set({ currentAnalysisId }),
  setStage: (stage) => set({ stage })
}));

