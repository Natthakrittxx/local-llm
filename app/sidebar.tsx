"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteChat, renameChat } from "./actions";

export default function Sidebar({
  chats,
  currentId,
}: {
  chats: { id: string; title: string }[];
  currentId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false); // only used below md, where the list is a full-screen overlay
  const close = () => setOpen(false);

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-border bg-background p-2 md:hidden">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="chats"
          className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
        >
          {open ? "Close" : "Chats"}
        </button>
      </div>

      <nav
        id="chats"
        aria-label="Chats"
        className={`${open ? "flex" : "hidden"} fixed inset-0 z-10 flex-col gap-1 overflow-y-auto bg-background p-3 pt-16 text-sm md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:border-r md:border-border md:pt-3`}
      >
        <Link
          href="/"
          onClick={close}
          className="mb-2 rounded border border-zinc-300 p-2 text-center dark:border-zinc-700"
        >
          New chat
        </Link>
        {chats.map((c) => (
          <div
            key={c.id}
            className="flex items-center rounded hover:bg-zinc-100 has-[[aria-current=page]]:bg-zinc-200 dark:hover:bg-zinc-900 dark:has-[[aria-current=page]]:bg-zinc-800"
          >
            <Link
              href={`/?id=${c.id}`}
              onClick={close}
              aria-current={c.id === currentId ? "page" : undefined}
              className="flex-1 truncate p-2"
            >
              {c.title}
            </Link>
            {/* ponytail: native prompt/confirm dialogs; swap for inline editing if they feel clunky */}
            <button
              aria-label={`Rename "${c.title}"`}
              className="px-1 text-zinc-400 hover:text-foreground"
              onClick={async () => {
                const title = prompt("Rename chat", c.title);
                if (!title?.trim()) return;
                await renameChat(c.id, title);
                router.refresh();
              }}
            >
              ✎
            </button>
            <button
              aria-label={`Delete "${c.title}"`}
              className="px-1 pr-2 text-zinc-400 hover:text-red-600"
              onClick={async () => {
                if (!confirm(`Delete "${c.title}"?`)) return;
                await deleteChat(c.id);
                if (c.id === currentId) router.push("/");
                else router.refresh();
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </nav>
    </>
  );
}
