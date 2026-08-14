import { NextResponse } from "next/server";
import { parseAndAuditSEO } from "../../../lib/parser";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ message: "Valid website URL is required." }, { status: 400 });
    }

    const report = await parseAndAuditSEO(url);
    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Failed to analyze target website URL. Make sure the domain is accessible." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ message: "URL query parameter is required. Example: ?url=https://sriexplainer.in" }, { status: 400 });
  }

  try {
    const report = await parseAndAuditSEO(targetUrl);
    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to analyze URL" }, { status: 500 });
  }
}
