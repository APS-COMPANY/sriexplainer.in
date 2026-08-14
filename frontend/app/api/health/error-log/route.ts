import { NextResponse } from "next/server";
import { z } from "zod";
import { tursoExecute, tursoQuery } from "../../../../lib/db";

const errorSchema = z.object({
  errorType: z.string().default("API Error"),
  message: z.string().min(1),
  route: z.string().optional().default(""),
  statusCode: z.number().optional().default(500)
});

function sanitizeErrorMessage(msg: string): string {
  return msg
    .replace(/bearer\s+[a-zA-Z0-9\._\-]+/gi, "bearer [REDACTED]")
    .replace(/password=["'][^"']+["']/gi, 'password="[REDACTED]"')
    .replace(/token=["'][^"']+["']/gi, 'token="[REDACTED]"')
    .slice(0, 300);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = errorSchema.parse(body);

    const errorId = crypto.randomUUID();
    const now = new Date().toISOString();
    const cleanMsg = sanitizeErrorMessage(data.message);

    await tursoExecute(`
      INSERT INTO app_errors (id, errorType, message, route, statusCode, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      errorId,
      data.errorType.slice(0, 50),
      cleanMsg,
      data.route.slice(0, 100),
      data.statusCode,
      now
    ]);

    // Keep error logs table under 500 records to maintain high performance
    const countRes = await tursoQuery("SELECT COUNT(*) as count FROM app_errors", []);
    const count = Number(countRes[0]?.count || 0);
    if (count > 500) {
      await tursoExecute("DELETE FROM app_errors WHERE id IN (SELECT id FROM app_errors ORDER BY createdAt ASC LIMIT 100)", []);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
