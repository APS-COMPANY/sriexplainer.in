import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQueryOne } from "../../../../lib/db";

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || "";
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || "";
const CASHFREE_ENV = (process.env.CASHFREE_ENVIRONMENT || "PRODUCTION").toUpperCase();

const CASHFREE_URL = CASHFREE_ENV === "PRODUCTION"
  ? "https://api.cashfree.com/pg/orders"
  : "https://sandbox.cashfree.com/pg/orders";

export async function POST(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.user) {
    return NextResponse.json({ message: auth.error || "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const d = z.object({
      plan: z.string().optional().default("Monthly VIP Pass"),
      amount: z.number().optional().default(39)
    }).parse(body);

    const user = await tursoQueryOne("SELECT * FROM users WHERE id = ?", [auth.user.id]);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const orderId = `order_${user.id.slice(0, 8)}_${Date.now()}`;
    const origin = req.headers.get("origin") || "https://sriexplainer.in";

    const payload = {
      order_id: orderId,
      order_amount: d.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: user.id,
        customer_name: user.name || "Subscriber",
        customer_email: user.email,
        customer_phone: user.phone || "9999999999"
      },
      order_meta: {
        return_url: `${origin}/profile?order_id={order_id}`
      }
    };

    const res = await fetch(CASHFREE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ message: `Cashfree Order Error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      ...data,
      environment: CASHFREE_ENV
    });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Payment session creation failed" }, { status: 500 });
  }
}
