import { connection } from "next/server";
import { Suspense } from "react";
import { listChats, loadChat } from "@/lib/chats";
import { baseURL } from "@/lib/lmstudio";
import Chat from "./chat";
import Sidebar from "./sidebar";

// ponytail: lists every non-embedding model LM Studio has; filter to qwen here if others get downloaded
async function getModels() {
  const res = await fetch(`${baseURL}/models`).catch(() => null);
  const { data = [] }: { data?: { id: string }[] } = res?.ok ? await res.json() : {};
  return data.map((m) => m.id).filter((id) => !id.includes("embed"));
}

async function ChatPage({ searchParams }: PageProps<"/">) {
  const { id: param } = await searchParams;
  await connection(); // new chat ids must be made per request, not at prerender
  const id = typeof param === "string" ? param : crypto.randomUUID();
  const [models, chats, messages] = await Promise.all([
    getModels(),
    listChats(),
    loadChat(id),
  ]);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar chats={chats} currentId={id} />
      <Chat key={id} id={id} models={models} initialMessages={messages} />
    </div>
  );
}

export default function Home(props: PageProps<"/">) {
  return (
    <Suspense>
      <ChatPage {...props} />
    </Suspense>
  );
}
