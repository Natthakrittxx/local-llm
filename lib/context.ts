import type { UIMessage } from "ai";

// ponytail: rough estimates (chars/3 for text, flat cost per image); swap in a real tokenizer if trims land badly
const IMAGE_TOKENS = 1500;
const tokens = (m: UIMessage) =>
  m.parts.reduce(
    (n, p) =>
      n + (p.type === "text" ? Math.ceil(p.text.length / 3) : p.type === "file" ? IMAGE_TOKENS : 0),
    0,
  );

// Shapes chat history to fit the model's context window: old reasoning and
// images (except in the newest user message) are dropped, then the oldest
// messages until the rest fits the token budget.
export function fitContext(messages: UIMessage[], budget: number): UIMessage[] {
  if (messages.length === 0) return messages;
  const lastUser = messages.findLastIndex((m) => m.role === "user");
  const slim = messages.map((m, i) => ({
    ...m,
    parts: m.parts.flatMap((p) =>
      p.type === "reasoning"
        ? []
        : p.type === "file" && i !== lastUser
          ? [{ type: "text" as const, text: "[image omitted]" }]
          : [p],
    ),
  }));

  let start = slim.length - 1; // the newest message is always kept
  let used = tokens(slim[start]);
  while (start > 0 && used + tokens(slim[start - 1]) <= budget) used += tokens(slim[--start]);
  while (start < slim.length - 1 && slim[start].role !== "user") start++; // open on a user turn
  return slim.slice(start);
}
