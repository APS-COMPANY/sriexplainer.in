import { NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/auth";
import { tursoQuery } from "../../../../lib/db";

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth.isAdmin && auth.user?.role !== "co_admin") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const statusFilter = searchParams.get("status") || "all";
  const sortBy = searchParams.get("sortBy") || "expiry_desc";

  const rows = await tursoQuery(`
    SELECT sub.*, u.name as userName, u.email as userEmail
    FROM subscriptions sub
    LEFT JOIN users u ON sub.userId = u.id
    ORDER BY sub.createdAt DESC
  `);

  const now = new Date();

  const allSubscriptions = rows.map((r: any) => {
    const endsAtDate = r.endsAt ? new Date(r.endsAt) : new Date(0);
    const startsAtDate = r.startsAt ? new Date(r.startsAt) : new Date();

    let computedStatus = r.status || "active";
    if (computedStatus === "active" && endsAtDate < now) {
      computedStatus = "expired";
    }

    const diffTime = endsAtDate.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return {
      subscriptionId: r.id,
      userId: r.userId || "",
      userName: r.userName || "Subscriber",
      userEmail: r.userEmail || "no-email@sriexplainer.com",
      planName: r.plan || "Monthly Premium Pass",
      amount: Number(r.amount || 0),
      paymentId: r.paymentId || "ONLINE_PAYMENT",
      source: r.paymentId === "ADMIN_GRANTED" ? "Admin Granted" : "Paid Subscription",
      purchaseDate: r.startsAt || r.createdAt,
      expiryDate: r.endsAt,
      remainingDays,
      status: computedStatus
    };
  });

  // Calculate Stats
  const totalUsers = allSubscriptions.length;
  const activeUsers = allSubscriptions.filter((s) => s.status === "active").length;
  const expiredUsers = allSubscriptions.filter((s) => s.status === "expired").length;
  const cancelledUsers = allSubscriptions.filter((s) => s.status === "cancelled").length;

  // Filter Subscriptions
  let filtered = allSubscriptions;
  if (statusFilter !== "all") {
    filtered = filtered.filter((s) => s.status === statusFilter);
  }

  if (search) {
    filtered = filtered.filter(
      (s) =>
        s.userEmail.toLowerCase().includes(search) ||
        s.userName.toLowerCase().includes(search) ||
        s.userId.toLowerCase().includes(search) ||
        s.paymentId.toLowerCase().includes(search)
    );
  }

  // Sort
  if (sortBy === "expiry_asc") {
    filtered.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  } else {
    filtered.sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime());
  }

  return NextResponse.json({
    stats: {
      totalUsers,
      activeUsers,
      expiredUsers,
      cancelledUsers
    },
    subscriptions: filtered
  });
}
