import { Suspense } from "react";
import { baseURL } from "@/lib/lmstudio";
import Chat from "./chat";

// ponytail: lists every non-embedding model LM Studio has; filter to qwen here if others get downloaded
async function ModelsChat() {
  const res = await fetch(`${baseURL}/models`).catch(() => null);
  const { data = [] }: { data?: { id: string }[] } = res?.ok ? await res.json() : {};
  const models = data.map((m) => m.id).filter((id) => !id.includes("embed"));
  return <Chat models={models} />;
}

export default function Home() {
  return (
    <Suspense>
      <ModelsChat />
    </Suspense>
  );
}
