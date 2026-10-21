import assert from "node:assert/strict";
import { test } from "node:test";
import type { UIMessage } from "ai";
import { fitContext } from "./context";

const msg = (id: string, role: UIMessage["role"], ...parts: UIMessage["parts"]): UIMessage => ({
  id,
  role,
  parts,
});
const text = (t: string) => ({ type: "text" as const, text: t });
const image = { type: "file" as const, mediaType: "image/png", url: "data:image/png;base64,AA" };

test("keeps everything that fits, minus reasoning", () => {
  const out = fitContext(
    [msg("1", "user", text("hi")), msg("2", "assistant", { type: "reasoning", text: "hmm" }, text("hello"))],
    1000,
  );
  assert.deepEqual(out.map((m) => m.id), ["1", "2"]);
  assert.deepEqual(out[1].parts, [text("hello")]);
});

test("images survive only in the newest user message", () => {
  const out = fitContext(
    [msg("1", "user", image, text("what is this?")), msg("2", "assistant", text("a cat")), msg("3", "user", image)],
    10_000,
  );
  assert.deepEqual(out[0].parts, [text("[image omitted]"), text("what is this?")]);
  assert.deepEqual(out[2].parts, [image]);
});

test("drops oldest messages over budget and opens on a user turn", () => {
  const long = "x".repeat(300); // ~100 tokens each
  const out = fitContext(
    [
      msg("1", "user", text(long)),
      msg("2", "assistant", text(long)),
      msg("3", "user", text(long)),
      msg("4", "assistant", text(long)),
      msg("5", "user", text(long)),
    ],
    250, // room for 2 messages: 4 (assistant) + 5, then 4 is skipped to open on a user turn
  );
  assert.deepEqual(out.map((m) => m.id), ["5"]);
});

test("newest message is kept even when alone over budget", () => {
  assert.deepEqual(fitContext([msg("1", "user", text("x".repeat(3000)))], 10).map((m) => m.id), ["1"]);
});
