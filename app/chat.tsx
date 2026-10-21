"use client";

import { useChat } from "@ai-sdk/react";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { AlertTriangle, ArrowUp, ChevronDown, ChevronRight, Paperclip, Square, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import type { ChatMessage } from "@/lib/chats";
import type { ModelInfo } from "@/lib/lmstudio";

const plugins = { code, math, mermaid };
const num = new Intl.NumberFormat("en-US");
const shortId = (id?: string) => id?.split("/").pop();

// "VLM · Q4_K_M · 8,192 ctx" — straight from LM Studio, nothing estimated
function readout(m?: ModelInfo) {
  if (!m) return "";
  const ctx = m.state === "loaded" ? `${num.format(m.loaded_context_length ?? 0)} ctx` : "not loaded";
  return [m.type.toUpperCase(), m.quantization, ctx].filter(Boolean).join(" · ");
}

// ["412 tok", "2.1 s", "196 tok/s"] — measured by the API route for this reply
function stats(meta: ChatMessage["metadata"]) {
  if (!meta?.outputTokens || !meta.ms) return [];
  const s = meta.ms / 1000;
  return [`${num.format(meta.outputTokens)} tok`, `${s.toFixed(1)} s`, `${Math.round(meta.outputTokens / s)} tok/s`];
}

const row = "grid gap-xs border-b border-rule py-lg md:grid-cols-[10rem_minmax(0,1fr)] md:gap-lg";
const label = "flex flex-wrap items-baseline gap-x-xs gap-y-3xs font-mono text-label md:flex-col";

export default function Chat({
  id,
  models,
  host,
  initialMessages,
}: {
  id: string;
  models: ModelInfo[];
  host: string;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [model, setModel] = useState(models[0]?.id ?? "");
  const [fast, setFast] = useState(true);
  const [files, setFiles] = useState<FileList>();
  const fileInput = useRef<HTMLInputElement>(null);
  const transcript = useRef<HTMLElement>(null);
  const stick = useRef(true); // follow the newest output unless the user scrolled up to read

  useEffect(() => {
    const atBottom = () => innerHeight + scrollY >= document.documentElement.scrollHeight - 80;
    const onScroll = () => {
      stick.current = atBottom();
    };
    // fires on open, on every streamed chunk, and when images / diagrams finish rendering
    const ro = new ResizeObserver(() => {
      if (stick.current) scrollTo({ top: document.documentElement.scrollHeight });
    });
    addEventListener("scroll", onScroll, { passive: true });
    if (transcript.current) ro.observe(transcript.current);
    return () => {
      removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  const { messages, sendMessage, status, stop, error } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    onFinish: () => {
      // chat is saved by now: put its id in the URL and refresh the sidebar list
      window.history.replaceState(null, "", `/?id=${id}`);
      router.refresh();
    },
  });
  const busy = status === "submitted" || status === "streaming";
  const current = models.find((m) => m.id === model);
  const vision = current?.type === "vlm";
  const canSend = !!model && !busy && (!!input.trim() || !!files?.length);

  function clearFiles() {
    setFiles(undefined);
    if (fileInput.current) fileInput.current.value = "";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    stick.current = true;
    sendMessage({ text: input, files }, { body: { model, fast } });
    setInput("");
    clearFiles();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="z-(--z-raised) border-b border-rule bg-paper md:sticky md:top-0">
        {/* same width + padding as the transcript, so the toggle lines up with the conversation */}
        <div className="flex w-full max-w-4xl flex-wrap items-center gap-x-md gap-y-xs px-md py-sm md:px-xl">
          <div className="relative min-w-0">
            <select
              aria-label="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-11 max-w-full appearance-none truncate rounded-control border border-rule-2 bg-paper pr-xl pl-sm font-mono text-meta text-ink hover:bg-paper-2"
            >
              {models.length === 0 && <option value="">LM Studio not reachable</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-sm -translate-y-1/2 text-neutral"
            />
          </div>
          <p className="font-mono text-label tracking-wider text-neutral uppercase">{readout(current)}</p>
          <label className="ml-auto flex h-11 cursor-pointer items-center gap-xs text-meta whitespace-nowrap text-ink-2">
            <input
              type="checkbox"
              checked={fast}
              onChange={(e) => setFast(e.target.checked)}
              className="size-4 accent-accent"
            />
            Fast mode (no reasoning)
          </label>
        </div>
      </header>

      <main ref={transcript} className="flex w-full max-w-4xl flex-1 flex-col px-md md:px-xl">
        {messages.length === 0 && !busy && (
          <section className="flex min-w-0 flex-col gap-sm pt-xl pb-2xl">
            {models.length > 0 ? (
              <>
                <h1 className="font-display text-display leading-tight font-bold tracking-tight [overflow-wrap:anywhere] text-ink">
                  {shortId(model)}
                </h1>
                <p className="max-w-prose text-body text-ink-2">
                  Served by LM Studio at <span className="font-mono text-meta">{host}</span>. Each reply
                  shows its token count and speed; the chat saves after every reply.
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display text-display leading-tight font-bold tracking-tight [overflow-wrap:anywhere] text-ink">
                  LM Studio isn’t reachable
                </h1>
                <p className="max-w-prose text-body text-ink-2">
                  Nothing answered at <span className="font-mono text-meta">{host}</span>. Start the
                  server with <code className="font-mono text-meta">lms server start</code>, then reload.
                </p>
              </>
            )}
          </section>
        )}

        <ol className="flex flex-col">
          {messages.map((m) => (
            <li key={m.id} className={row}>
              <div className={label}>
                {m.role === "user" ? (
                  <span className="text-neutral">you</span>
                ) : (
                  <span className="break-all text-ink">{shortId(m.metadata?.model) ?? "assistant"}</span>
                )}
                {m.role === "assistant" &&
                  stats(m.metadata).map((s) => (
                    <span key={s} className="whitespace-nowrap text-neutral tabular-nums">
                      {s}
                    </span>
                  ))}
              </div>
              {/* break-word (not anywhere) so long strings wrap but tables keep whole words and scroll */}
              <div className="flex min-w-0 flex-col gap-sm wrap-break-word">
                {m.parts.map((part, i) => {
                  if (part.type === "file" && part.mediaType.startsWith("image/"))
                    return (
                      <figure key={i} className="w-fit max-w-full overflow-hidden rounded-control border border-rule">
                        {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimize */}
                        <img
                          src={part.url}
                          alt={part.filename ?? "Attached image"}
                          className="block h-auto max-h-56 max-w-full"
                        />
                      </figure>
                    );
                  if (part.type === "reasoning")
                    return (
                      <details key={i} className="group">
                        <summary className="flex h-8 w-fit cursor-pointer list-none items-center gap-2xs font-mono text-label tracking-wider text-neutral uppercase hover:text-ink">
                          <ChevronRight
                            size={14}
                            aria-hidden
                            className="transition-transform duration-(--dur-short) ease-(--ease-in-out) group-open:rotate-90"
                          />
                          Reasoning
                        </summary>
                        <p className="mt-xs border-l border-rule pl-sm text-meta whitespace-pre-wrap text-neutral">
                          {part.text}
                        </p>
                      </details>
                    );
                  if (part.type === "text")
                    return m.role === "user" ? (
                      <p key={i} className="max-w-prose text-body whitespace-pre-wrap text-ink">
                        {part.text}
                      </p>
                    ) : (
                      <Streamdown
                        key={i}
                        plugins={plugins}
                        className="text-body text-ink-2 [&_:is(p,li,blockquote)]:max-w-prose"
                        isAnimating={status === "streaming" && m.id === messages.at(-1)?.id}
                      >
                        {part.text}
                      </Streamdown>
                    );
                })}
              </div>
            </li>
          ))}

          {status === "submitted" && (
            <li className={row}>
              <div className={label}>
                <span className="break-all text-ink">{shortId(model)}</span>
                <span className="text-neutral">waiting for first token</span>
              </div>
              <div aria-hidden className="flex flex-col gap-xs pt-2xs">
                <span className="h-3 w-2/3 animate-pulse rounded-control bg-paper-3" />
                <span className="h-3 w-1/3 animate-pulse rounded-control bg-paper-3" />
              </div>
            </li>
          )}
        </ol>

        {error && (
          <div role="alert" className="my-lg flex gap-sm rounded-control border border-error px-md py-sm text-meta text-error">
            <AlertTriangle size={16} aria-hidden className="mt-3xs shrink-0" />
            <p>
              <span className="font-medium">Request failed.</span> {error.message}
            </p>
          </div>
        )}
      </main>

      <form
        onSubmit={submit}
        className="sticky bottom-0 z-(--z-raised) w-full max-w-4xl bg-paper px-md pt-xs pb-md md:px-xl md:pb-lg"
      >
        <div className="rounded-card border border-rule-2 bg-paper has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-accent">
          {!!files?.length && (
            <div className="flex flex-wrap items-center gap-xs border-b border-rule px-sm py-xs font-mono text-label">
              {Array.from(files, (f) => (
                <span key={f.name} className="max-w-48 truncate rounded-control bg-paper-2 px-xs py-3xs text-ink-2">
                  {f.name}
                </span>
              ))}
              <button
                type="button"
                onClick={clearFiles}
                aria-label="Remove attached images"
                className="relative grid size-6 place-items-center rounded-control text-neutral before:absolute before:-inset-2.5 hover:bg-paper-2 hover:text-ink"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          )}
          <textarea
            aria-label="Message"
            rows={1}
            value={input}
            placeholder={model ? `Message ${shortId(model)}` : "No model available"}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line; leave IME composition (Thai, CJK) alone
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            className="block max-h-48 min-h-11 w-full resize-none bg-transparent px-sm pt-sm pb-2xs text-body text-ink outline-none field-sizing-content placeholder:text-neutral"
          />
          <div className="flex items-center gap-xs px-xs pb-xs">
            <label
              aria-disabled={!vision}
              className="relative flex h-11 shrink-0 cursor-pointer items-center gap-xs rounded-control px-sm text-meta text-ink-2 hover:bg-paper-2 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
            >
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                disabled={!vision}
                className="sr-only"
                onChange={(e) => setFiles(e.target.files ?? undefined)}
              />
              <Paperclip size={16} aria-hidden />
              Image
            </label>
            <p className="min-w-0 flex-1 truncate font-mono text-label text-neutral">
              {!vision && "Images need a VLM"}
              <span className="hidden md:inline">
                {!vision && " · "}Enter to send · Shift+Enter for a new line
              </span>
            </p>
            {busy ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Stop generating"
                className="grid size-11 shrink-0 place-items-center rounded-control border border-rule-2 text-ink hover:bg-paper-2 active:translate-y-px"
              >
                <Square size={14} fill="currentColor" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
                className="grid size-11 shrink-0 place-items-center rounded-control bg-accent text-accent-ink transition-[background-color,transform] duration-(--dur-micro) ease-(--ease-out) hover:bg-accent-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent"
              >
                <ArrowUp size={18} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
