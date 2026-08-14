import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../../lib/auth";
import { tursoExecute } from "../../../../../lib/db";

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = updateSchema.parse(body);

    await tursoExecute("UPDATE user_reports SET status = ? WHERE id = ?", [status, id]);

    return NextResponse.json({
      success: true,
      message: `Report status updated to ${status}`
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to update report status" }, { status: 400 });
  }
}
