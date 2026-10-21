"use client";

import { PanelLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteChat, renameChat } from "./actions";

const iconButton =
  "relative grid size-8 place-items-center rounded-control text-neutral before:absolute before:-inset-1.5 hover:bg-paper-3 active:translate-y-px";

export default function Sidebar({
  chats,
  currentId,
  host,
  online,
}: {
  chats: { id: string; title: string; when: string }[];
  currentId: string;
  host: string;
  online: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false); // only used below md, where the list is an overlay
  const close = () => setOpen(false);

  const wordmark = (
    <span className="font-display text-title font-semibold tracking-tight text-ink">local-llm</span>
  );

  return (
    <>
      <div className="sticky top-0 z-(--z-sticky) flex h-14 items-center justify-between border-b border-rule bg-paper px-md md:hidden">
        {wordmark}
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="chats"
          className="flex h-11 items-center gap-xs whitespace-nowrap rounded-control border border-rule-2 px-sm text-meta text-ink hover:bg-paper-2 active:translate-y-px"
        >
          {open ? <X size={16} aria-hidden /> : <PanelLeft size={16} aria-hidden />}
          {open ? "Close" : "Chats"}
        </button>
      </div>

      <nav
        id="chats"
        aria-label="Chats"
        className={`${open ? "flex" : "hidden"} fixed inset-x-0 top-14 bottom-0 z-(--z-dropdown) flex-col bg-paper md:sticky md:top-0 md:z-auto md:flex md:h-dvh md:w-64 md:shrink-0 md:border-r md:border-rule`}
      >
        <div className="flex flex-col gap-2xs px-md pt-lg pb-md">
          <span className="hidden md:block">{wordmark}</span>
          <p className="flex items-center gap-xs font-mono text-label text-neutral">
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${online ? "bg-accent" : "bg-error"}`}
            />
            <span className="truncate">
              {online ? "LM Studio" : "LM Studio offline"} · {host}
            </span>
          </p>
        </div>

        <div className="px-md">
          <Link
            href="/"
            onClick={close}
            className="flex h-11 items-center gap-xs whitespace-nowrap rounded-control border border-rule-2 px-sm text-meta font-medium text-ink hover:bg-paper-2 active:translate-y-px"
          >
            <Plus size={16} aria-hidden />
            New chat
          </Link>
        </div>

        <h2 className="px-md pt-xl pb-xs font-mono text-label uppercase tracking-wider text-neutral">
          History
        </h2>
        <ul className="flex flex-1 flex-col gap-3xs overflow-y-auto px-xs pb-md">
          {chats.length === 0 && (
            <li className="px-sm py-xs text-meta text-neutral">
              Chats save here after the first reply.
            </li>
          )}
          {chats.map((c) => (
            <li
              key={c.id}
              className="group flex items-center rounded-control pr-2xs hover:bg-paper-2 active:bg-paper-3 has-[[aria-current=page]]:bg-paper-3"
            >
              <Link
                href={`/?id=${c.id}`}
                onClick={close}
                aria-current={c.id === currentId ? "page" : undefined}
                className="flex min-w-0 flex-1 flex-col gap-3xs py-xs pl-sm pr-xs"
              >
                <span className="flex items-center gap-xs">
                  {c.id === currentId && (
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
                  )}
                  <span className="truncate text-meta text-ink">{c.title}</span>
                </span>
                <span className="font-mono text-label tabular-nums text-neutral">{c.when}</span>
              </Link>
              {/* hover reveals on mouse; always shown for touch, keyboard focus and the open chat */}
              <div className="flex gap-2xs opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 group-has-[[aria-current=page]]:opacity-100 pointer-coarse:opacity-100">
                {/* ponytail: native prompt/confirm dialogs; swap for inline editing if they feel clunky */}
                <button
                  aria-label={`Rename "${c.title}"`}
                  className={`${iconButton} hover:text-ink`}
                  onClick={async () => {
                    const title = prompt("Rename chat", c.title);
                    if (!title?.trim()) return;
                    await renameChat(c.id, title);
                    router.refresh();
                  }}
                >
                  <Pencil size={14} aria-hidden />
                </button>
                <button
                  aria-label={`Delete "${c.title}"`}
                  className={`${iconButton} hover:text-error`}
                  onClick={async () => {
                    if (!confirm(`Delete "${c.title}"? This can't be undone.`)) return;
                    await deleteChat(c.id);
                    if (c.id === currentId) router.push("/");
                    else router.refresh();
                  }}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
