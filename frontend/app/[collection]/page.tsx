"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { Row, StatusSection } from "../../components/content";

export default function Collection() {
  const { collection } = useParams<{ collection: string }>();
  const title = collection ? collection.replace(/-/g, " ") : "collection";
  const colLower = (collection || "").toLowerCase().trim();

  if (colLower === "ongoing" || colLower === "completed" || colLower === "upcoming") {
    return (
      <main className="pt-8">
        <StatusSection status={colLower as "ongoing" | "completed" | "upcoming"} title={title.toUpperCase()} />
      </main>
    );
  }

  const ep = collection === "trending" ? "/series?limit=60" : "/series?limit=60";
  return (
    <main className="pt-8">
      <h1 className="shell capitalize text-3xl font-bold">{title}</h1>
      <Row title="Browse collection" endpoint={ep} />
    </main>
  );
}
