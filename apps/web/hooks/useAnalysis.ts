"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

export const useAnalysis = (accessToken?: string) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { currentAnalysis, currentAnalysisId, setCurrentAnalysis, setCurrentAnalysisId, setStage, stage } =
    useAppStore();

  const startAnalysis = useCallback(
    async (input: string) => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      setError(null);
      setShareUrl(null);
      setStage("queued");

      const created = await api.createAnalysis(accessToken, input);
      setCurrentAnalysisId(created.analysisId);

      const stream = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/api/analyses/${created.analysisId}/stream?accessToken=${encodeURIComponent(accessToken)}`
      );

      eventSourceRef.current = stream;

      stream.addEventListener("queued", () => setStage("queued"));
      stream.addEventListener("processing", () => setStage("processing"));
      stream.addEventListener("failed", () => {
        setStage("failed");
        setError("The analysis failed. Please try again.");
        stream.close();
      });
      stream.addEventListener("complete", async (event) => {
        const payload = JSON.parse((event as MessageEvent).data);
        const analysis = await api.getAnalysis(created.analysisId, accessToken);
        setCurrentAnalysis(analysis);
        setStage("complete");
        if (payload?.result) {
          setCurrentAnalysis(analysis);
        }
        stream.close();
      });
    },
    [accessToken, setCurrentAnalysis, setCurrentAnalysisId, setStage]
  );

  const createShareLink = useCallback(async () => {
    if (!accessToken || !currentAnalysisId) {
      return null;
    }

    const analysis = await api.toggleShare(accessToken, currentAnalysisId, true);
    setCurrentAnalysis(analysis);
    const url = `${window.location.origin}/report/${analysis.id}?token=${analysis.shareToken}`;
    setShareUrl(url);
    return url;
  }, [accessToken, currentAnalysisId, setCurrentAnalysis]);

  useEffect(() => () => eventSourceRef.current?.close(), []);

  return {
    currentAnalysis,
    currentAnalysisId,
    stage,
    error,
    shareUrl,
    startAnalysis,
    createShareLink
  };
};

