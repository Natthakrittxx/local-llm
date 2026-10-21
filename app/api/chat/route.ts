import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { lmstudio } from "@/lib/lmstudio";

export async function POST(req: Request) {
  const {
    messages,
    model,
    fast,
  }: { messages: UIMessage[]; model: string; fast: boolean } = await req.json();

  const result = streamText({
    model: lmstudio(model),
    messages: await convertToModelMessages(messages),
    reasoning: fast ? "none" : undefined, // sent as reasoning_effort: "none", skips thinking
    maxRetries: 0, // fail fast if LM Studio is not running
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // ponytail: raw error text is fine for a local-only app; mask it before exposing publicly
      onError: (e) => (e instanceof Error ? e.message : String(e)),
    }),
  });
}
