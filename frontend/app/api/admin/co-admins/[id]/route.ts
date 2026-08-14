import { NextResponse } from "next/server";
import { verifyAuth, ADMIN_EMAILS } from "../../../../../lib/auth";
import { tursoQueryOne, tursoExecute } from "../../../../../lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyAuth(_req);
  if (!auth.isMainAdmin) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const targetUser = await tursoQueryOne("SELECT * FROM users WHERE id = ?", [id]);
  if (!targetUser) {
    return NextResponse.json({ message: "Co-Admin user account not found." }, { status: 404 });
  }

  const cleanEmail = (targetUser.email || "").toLowerCase().trim();
  if (ADMIN_EMAILS.includes(cleanEmail)) {
    return NextResponse.json({ message: "Cannot revoke Main Admin permissions." }, { status: 400 });
  }

  await tursoExecute("UPDATE users SET role = 'user' WHERE id = ?", [targetUser.id]);

  return NextResponse.json({
    success: true,
    message: `Co-Admin access revoked for ${targetUser.email}. Account returned to normal user.`
  });
}
