import { connection } from "next/server";
import { Suspense } from "react";
import { listChats, loadChat } from "@/lib/chats";
import { baseURL, listModels } from "@/lib/lmstudio";
import Chat from "./chat";
import Sidebar from "./sidebar";

// formatted on the server so client hydration sees the same string
const when = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

async function ChatPage({ searchParams }: PageProps<"/">) {
  const { id: param } = await searchParams;
  await connection(); // new chat ids must be made per request, not at prerender
  const id = typeof param === "string" ? param : crypto.randomUUID();
  const [all, chats, messages] = await Promise.all([listModels(), listChats(), loadChat(id)]);
  const models = all.filter((m) => m.type !== "embeddings");
  const host = new URL(baseURL).host;

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar
        chats={chats.map((c) => ({ id: c.id, title: c.title, when: when.format(c.mtimeMs) }))}
        currentId={id}
        host={host}
        online={all.length > 0}
      />
      <Chat key={id} id={id} models={models} host={host} initialMessages={messages} />
    </div>
  );
}

export default function Home(props: PageProps<"/">) {
  return (
    <Suspense
      fallback={
        // fades in only if LM Studio is slow to answer, so fast loads never flash it
        <p className="m-auto animate-[fade-in_var(--dur-short)_var(--ease-out)_400ms_both] font-mono text-label text-neutral">
          Connecting to LM Studio…
        </p>
      }
    >
      <ChatPage {...props} />
    </Suspense>
  );
}
