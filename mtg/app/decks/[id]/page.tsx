import { Suspense } from "react";
import type { Metadata } from "next";
import DeckEditor from "../DeckEditor";

export const metadata: Metadata = { title: "Edit deck | MTG Duel" };

// With Cache Components, route params are runtime data and must be read inside <Suspense>.
export default function EditDeckPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-zinc-600">Loading deck…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeckEditor key={id} deckId={id} />;
}
