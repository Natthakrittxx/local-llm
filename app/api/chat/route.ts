import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  toUIMessageStream,
} from "ai";
import { type ChatMessage, isChatId, saveChat } from "@/lib/chats";
import { fitContext } from "@/lib/context";
import { contextLength, lmstudio } from "@/lib/lmstudio";

export async function POST(req: Request) {
  const {
    id,
    messages,
    model,
    fast,
  }: { id: string; messages: ChatMessage[]; model: string; fast: boolean } =
    await req.json();
  if (!isChatId(id)) return new Response("Invalid chat id", { status: 400 });
  const started = Date.now();

  const result = streamText({
    model: lmstudio(model),
    // 3/4 of the window for history, the rest for the reply; full history is still saved
    messages: await convertToModelMessages(
      fitContext(messages, (await contextLength(model)) * 0.75),
    ),
    reasoning: fast ? "none" : undefined, // sent as reasoning_effort: "none", skips thinking
    maxRetries: 0, // fail fast if LM Studio is not running
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: generateId,
      // measured here, shown under each reply: model id, output tokens, wall time incl. prompt processing
      messageMetadata: ({ part }) => {
        if (part.type === "start") return { model };
        if (part.type === "finish")
          return { model, outputTokens: part.totalUsage.outputTokens, ms: Date.now() - started };
      },
      // awaited before the stream closes, also runs when the user hits Stop
      onEnd: ({ messages }) => saveChat(id, messages),
      // ponytail: raw error text is fine for a local-only app; mask it before exposing publicly
      onError: (e) => (e instanceof Error ? e.message : String(e)),
    }),
  });
}
