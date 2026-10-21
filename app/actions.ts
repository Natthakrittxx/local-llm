"use server";

import * as chats from "@/lib/chats";

// Server Functions are public endpoints: lib/chats rejects unsafe ids, title is capped here
export async function deleteChat(id: string) {
  await chats.deleteChat(id);
}

export async function renameChat(id: string, title: string) {
  const t = String(title).trim().slice(0, 100);
  if (t) await chats.renameChat(id, t);
}
