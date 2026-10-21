import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const baseURL = process.env.LMSTUDIO_URL ?? "http://localhost:1234/v1";

export const lmstudio = createOpenAICompatible({ name: "lmstudio", baseURL });
