"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useState } from "react";

export default function Chat({ models }: { models: string[] }) {
  const [input, setInput] = useState("");
  const [model, setModel] = useState(models[0] ?? "");
  const [fast, setFast] = useState(true);
  const [files, setFiles] = useState<FileList>();
  const fileInput = useRef<HTMLInputElement>(null);
  const { messages, sendMessage, status, stop, error } = useChat();
  const busy = status === "submitted" || status === "streaming";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <select
          aria-label="Model"
          className="flex-1 rounded border border-zinc-300 bg-transparent p-2 dark:border-zinc-700"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {models.length === 0 && <option value="">LM Studio not reachable</option>}
          {models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fast}
            onChange={(e) => setFast(e.target.checked)}
          />
          Fast mode (no thinking)
        </label>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`whitespace-pre-wrap rounded p-3 ${
              m.role === "user" ? "self-end bg-zinc-200 dark:bg-zinc-800" : ""
            }`}
          >
            {m.parts.map((part, i) => {
              if (part.type === "text") return <span key={i}>{part.text}</span>;
              if (part.type === "file" && part.mediaType.startsWith("image/"))
                return (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimize
                  <img
                    key={i}
                    src={part.url}
                    alt={part.filename ?? "Attached image"}
                    className="mb-2 max-h-48 rounded"
                  />
                );
              if (part.type === "reasoning")
                return (
                  <details key={i} className="mb-2 text-sm text-zinc-500">
                    <summary>Thinking</summary>
                    {part.text}
                  </details>
                );
            })}
          </div>
        ))}
        {error && <p className="text-red-600">{error.message}</p>}
      </div>

      <form
        className="sticky bottom-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if ((!input.trim() && !files?.length) || !model) return;
          sendMessage({ text: input, files }, { body: { model, fast } });
          setInput("");
          setFiles(undefined);
          if (fileInput.current) fileInput.current.value = "";
        }}
      >
        <label className="flex cursor-pointer items-center rounded border border-zinc-300 px-3 text-sm focus-within:ring-2 dark:border-zinc-700">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => setFiles(e.target.files ?? undefined)}
          />
          {files?.length ? `${files.length} image${files.length > 1 ? "s" : ""}` : "Attach"}
        </label>
        <input
          aria-label="Message"
          className="flex-1 rounded border border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.target.value)}
        />
        {busy ? (
          <button type="button" onClick={stop} className="rounded border px-4">
            Stop
          </button>
        ) : (
          <button className="rounded bg-black px-4 text-white dark:bg-white dark:text-black">
            Send
          </button>
        )}
      </form>
    </main>
  );
}
