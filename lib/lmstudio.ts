import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const baseURL = process.env.LMSTUDIO_URL ?? "http://localhost:1234/v1";

// includeUsage: ask for token counts on streamed replies (feeds the per-reply stats)
export const lmstudio = createOpenAICompatible({ name: "lmstudio", baseURL, includeUsage: true });

export type ModelInfo = {
  id: string;
  type: "llm" | "vlm" | "embeddings";
  quantization?: string;
  state: "loaded" | "not-loaded";
  max_context_length: number;
  loaded_context_length?: number;
};

// LM Studio's own REST API: unlike /v1/models it reports type, quantization and context sizes
export async function listModels(): Promise<ModelInfo[]> {
  const res = await fetch(new URL("/api/v0/models", baseURL)).catch(() => null);
  return res?.ok ? (await res.json()).data : [];
}

export async function contextLength(model: string) {
  const info = (await listModels()).find((m) => m.id === model);
  // ponytail: 4096 is a safe guess for a model LM Studio hasn't loaded yet
  return info?.loaded_context_length ?? 4096;
}
