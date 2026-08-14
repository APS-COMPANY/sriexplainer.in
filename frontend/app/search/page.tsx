"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Poster, Show } from "../../components/content";

function Results() {
  const p = useSearchParams();
  const q = p.get("q") || "";
  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: async () => (q ? (await api.get<Show[]>(`/search?q=${encodeURIComponent(q)}`)).data : [])
  });
  const items = Array.isArray(data) ? data : [];

  return (
    <main className="shell py-10">
      <h1 className="text-3xl font-bold">Search</h1>
      <p className="mt-2 text-zinc-400">
        {q ? `Results for “${q}”` : "Use the search bar to find a story."}
      </p>
      <div className="mt-7 flex flex-wrap gap-4">
        {items.map((s) => (
          <Poster key={s._id} show={s} />
        ))}
      </div>
      {q && !isLoading && !items.length && (
        <p className="mt-8 text-zinc-500 font-medium">No Series Found</p>
      )}
    </main>
  );
}

export default function Search() {
  return (
    <Suspense fallback={<main className="shell py-10">Loading search…</main>}>
      <Results />
    </Suspense>
  );
}
