import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UIMessage } from "ai";

// metadata is written by the API route: which model answered, and how fast
export type ChatMessage = UIMessage<{ model?: string; outputTokens?: number; ms?: number }>;

type ChatFile = { title?: string; messages: ChatMessage[] };

const dir = path.join(process.cwd(), ".data", "chats");

// ids end up in file paths, so only allow safe characters
export const isChatId = (id: unknown): id is string =>
  typeof id === "string" && /^[\w-]{1,64}$/.test(id);

const file = (id: string) => {
  if (!isChatId(id)) throw new Error("Invalid chat id");
  return path.join(dir, `${id}.json`);
};

async function readChat(id: string): Promise<ChatFile> {
  if (!isChatId(id)) return { messages: [] };
  const data = JSON.parse(await readFile(file(id), "utf8").catch(() => "[]"));
  return Array.isArray(data) ? { messages: data } : data; // early chats were saved as a bare array
}

async function writeChat(id: string, chat: ChatFile) {
  await mkdir(dir, { recursive: true });
  await writeFile(file(id), JSON.stringify(chat));
}

export const loadChat = async (id: string) => (await readChat(id)).messages;

export const saveChat = async (id: string, messages: ChatMessage[]) =>
  writeChat(id, { ...(await readChat(id)), messages });

export const renameChat = async (id: string, title: string) =>
  writeChat(id, { ...(await readChat(id)), title });

export const deleteChat = (id: string) => rm(file(id), { force: true });

// ponytail: reads every chat file per page load; keep an index file if hundreds of chats make it slow
export async function listChats() {
  const names = await readdir(dir).catch(() => []);
  const chats = await Promise.all(
    names
      .filter((n) => n.endsWith(".json"))
      .map(async (n) => {
        const id = n.slice(0, -".json".length);
        const [chat, { mtimeMs }] = await Promise.all([readChat(id), stat(file(id))]);
        const first = chat.messages[0]?.parts.find((p) => p.type === "text");
        const title =
          chat.title ?? (first?.type === "text" ? first.text.slice(0, 40) : "Image chat");
        return { id, title, mtimeMs };
      }),
  );
  return chats.sort((a, b) => b.mtimeMs - a.mtimeMs);
}
