"use client";
import dynamic from "next/dynamic";

const HeaderInner = dynamic(
  () => import("./header").then((m) => ({ default: m.Header })),
  { ssr: false }
);

export function ClientHeader() {
  return <HeaderInner />;
}
