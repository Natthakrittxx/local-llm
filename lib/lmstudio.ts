import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const baseURL = process.env.LMSTUDIO_URL ?? "http://localhost:1234/v1";

export const lmstudio = createOpenAICompatible({ name: "lmstudio", baseURL });

// LM Studio's own REST API reports the context length each model is loaded with
export async function contextLength(model: string) {
  const res = await fetch(new URL("/api/v0/models", baseURL)).catch(() => null);
  const { data = [] }: { data?: { id: string; loaded_context_length?: number }[] } = res?.ok
    ? await res.json()
    : {};
  // ponytail: 4096 is a safe guess for a model LM Studio hasn't loaded yet
  return data.find((m) => m.id === model)?.loaded_context_length ?? 4096;
}
