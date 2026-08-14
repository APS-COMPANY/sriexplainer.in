import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

// Validate required Environment Variables on startup (Item 17)
const requiredEnvVars = [
  "JWT_SECRET",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "CASHFREE_APP_ID",
  "CASHFREE_SECRET_KEY",
  "CASHFREE_ENVIRONMENT"
];

const missingEnv = requiredEnvVars.filter((key) => !process.env[key] || !process.env[key]!.trim());
if (missingEnv.length > 0) {
  console.warn(`[Environment Notice]: The following environment variables are using default fallbacks: ${missingEnv.join(", ")}`);
} else {
  console.log("[Environment Check]: All required Environment Variables validated successfully!");
}

import crypto from "crypto";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { z } from "zod";
import { db, initDb, getDbFilePath, ensureDefaultSeed } from "./db";
import { admin, auth, isOfficialRumble, normalizeRumbleUrl, optionalAuth, tokenFor, mainAdmin, ADMIN_EMAILS } from "./middleware";
import { 
  detectTelegramChatId, 
  restoreDatabaseFromTelegram, 
  syncDatabaseToTelegram, 
  triggerRealtimeBackup, 
  startPeriodicBackupTimer,
  notifyTelegramUserRegistration,
  notifyTelegramGoogleLogin,
  notifyTelegramPayment,
  notifyTelegramWatchActivity,
  notifyTelegramCombinedUserProfile,
  uploadMediaToTelegramCloud,
  streamTelegramMedia
} from "./telegram-db";
import { AuthRequest } from "./types";
import { syncRestoreFromTursoCloud, syncWriteToTurso } from "./turso-sync";

import { loadBannedIpsIntoMemory, nasaCyberShieldMiddleware, banIpAddress, unbanIpAddress } from "./nasa-firewall";

// Initialize Turso Cloud & SQLite database before processing requests
const dbReadyPromise = (async () => {
  try {
    initDb();
    loadBannedIpsIntoMemory();
    console.log("[Database Boot] Restoring data from Turso Cloud Database...");
    await syncRestoreFromTursoCloud();
    ensureDefaultSeed();
    console.log("[Database Boot] Turso Cloud Database sync complete!");
  } catch (err) {
    console.error("[Database Boot] Turso restore error:", err);
    ensureDefaultSeed();
  }
})();

const app = express(), port = Number(process.env.PORT || 5000), api = express.Router();
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    frameguard: { action: "sameorigin" },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  })
);

app.use(cors({ origin: true, credentials: true }));

app.use(async (_req, _res, next) => {
  await dbReadyPromise;
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(nasaCyberShieldMiddleware);
app.use("/uploads", express.static("uploads", {
  maxAge: "30d",
  immutable: true,
  etag: true
}));

app.get("/uploads/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.resolve(process.cwd(), "uploads", filename);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath, { maxAge: "30d", immutable: true });
  }

  try {
    const row: any = db.prepare("SELECT filename, mimeType, data FROM media_storage WHERE filename = ? OR id = ?").get(filename, filename);
    if (row && row.data) {
      const buffer = Buffer.from(row.data, "base64");
      const uploadDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.promises.writeFile(filePath, buffer).catch(() => {});

      res.setHeader("Content-Type", row.mimeType || "image/png");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(buffer);
    }
  } catch (err: any) {
    console.error("[Media Fallback Error]:", err.message);
  }

  res.status(404).end();
});

// Strict Security Rate Limiters
const authRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." }
});

const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many payment checkout requests. Please try again shortly." }
});

app.use("/api/auth/login", authRateLimiter);
app.use("/api/auth/register", authRateLimiter);
app.use("/api/auth/google", authRateLimiter);
app.use("/api/payments/cashfree/order", paymentRateLimiter);

app.use("/api", rateLimit({ windowMs: 15 * 60_000, max: 500 }), api);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => cb(null, /^image\//.test(f.mimetype))
});

const safe = (fn: (req: any, res: any) => any) => (req: any, res: any) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    console.error("[API Server Error Trace]:", e);
    if (e?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ message: "An item with that name or key already exists" });
    }
    if (e?.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return res.status(401).json({ message: "Your login session has expired. Please sign out and sign in again." });
    }
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: e.errors?.[0]?.message || "Please check the submitted information" });
    }
    res.status(500).json({ message: e?.message || "Unexpected server error" });
  });

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Helper to check user active subscription status
const isUserSubscribed = (userId?: string): boolean => {
  if (!userId) return false;
  const user: any = db.prepare("SELECT role, subscriptionEndsAt FROM users WHERE id = ?").get(userId);
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!user.subscriptionEndsAt) return false;
  return new Date(user.subscriptionEndsAt).getTime() > Date.now();
};

// Helper to format series for MongoDB compatibility (_id) with dynamic metadata badges
const formatSeries = (row: any) => {
  if (!row) return null;
  let genres = [];
  try { genres = JSON.parse(row.genres || "[]"); } catch {}

  // Dynamically calculate total uploaded episode count & highest video quality from real production database
  let episodeCount = 0;
  let maxQuality = "1080P";

  try {
    const countRow: any = db.prepare("SELECT COUNT(*) as total FROM episodes WHERE seriesId = ?").get(row.id);
    episodeCount = countRow ? Number(countRow.total || 0) : 0;

    if (episodeCount > 0) {
      const qRows: any = db.prepare("SELECT DISTINCT quality FROM episodes WHERE seriesId = ?").all(row.id);
      const qualities = qRows.map((q: any) => (q.quality || "1080P").toUpperCase());

      if (qualities.some((q: string) => q.includes("4K") || q.includes("2160P"))) maxQuality = "4K";
      else if (qualities.some((q: string) => q.includes("2K") || q.includes("1440P"))) maxQuality = "2K";
      else if (qualities.some((q: string) => q.includes("1080P") || q.includes("FULL HD"))) maxQuality = "1080P";
      else if (qualities.some((q: string) => q.includes("720P"))) maxQuality = "720P";
      else if (qualities.some((q: string) => q.includes("480P"))) maxQuality = "480P";
      else if (qualities.some((q: string) => q.includes("360P"))) maxQuality = "360P";
      else if (qualities.length > 0) maxQuality = qualities[0];
    }
  } catch (err) {
    console.error("[Series Dynamic Calculation Error]:", err);
  }

  return {
    ...row,
    _id: row.id,
    logo: row.logo || "",
    episodeCount,
    maxQuality,
    genres,
    language: row.language || "English",
    rating: row.rating || "PG-13",
    visibility: row.visibility || "public",
    isUpcoming: Boolean(row.isUpcoming),
    isMovie: Boolean(row.isMovie),
    clicks: Number(row.clicks || 0),
    watchTime: Number(row.watchTime || 0),
    featured: Boolean(row.featured),
    trending: Boolean(row.trending)
  };
};

const formatEpisode = (row: any) => {
  if (!row) return null;
  const accessLower = String(row.access || "free").toLowerCase().trim();
  const isXpCoins = accessLower === "xp_coins" || accessLower === "premium" || accessLower === "subscription";
  return {
    ...row,
    _id: row.id,
    series: row.seriesId,
    quality: row.quality || "1080P",
    visibility: row.visibility || "public",
    access: isXpCoins ? "xp_coins" : "free",
    xpCost: isXpCoins ? Math.max(1, Number(row.xpCost || 5)) : 0,
    isUpcoming: Boolean(row.isUpcoming),
    clicks: Number(row.clicks || 0),
    watchTime: Number(row.watchTime || 0),
    commentsDisabled: Boolean(row.commentsDisabled),
    commentsLocked: Boolean(row.commentsLocked)
  };
};

api.get("/health", (_q, r) => r.json({ status: "ok", database: "SQLite" }));

// SITE BRANDING & COMMUNITY SETTINGS ENDPOINTS
api.get("/settings", safe(async (_req, res) => {
  const rows = db.prepare("SELECT key, value FROM site_settings").all();
  const settings: Record<string, string> = {};
  for (const r of rows as any[]) {
    settings[r.key] = r.value;
  }
  res.json({
    siteLogo: settings.siteLogo || "",
    siteBackground: settings.siteBackground || "",
    whatsappUrl: settings.whatsappUrl || "",
    telegramUrl: settings.telegramUrl || ""
  });
}));

api.post("/admin/settings", auth, admin, safe(async (req, res) => {
  const { siteLogo, siteBackground, whatsappUrl, telegramUrl } = req.body;
  const now = new Date().toISOString();

  if (whatsappUrl !== undefined && whatsappUrl !== "") {
    const isWaValid = /^(https?:\/\/)?(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\/.+/i.test(whatsappUrl.trim());
    if (!isWaValid) {
      return res.status(400).json({ message: "Invalid WhatsApp URL. Must be a valid WhatsApp Channel or Group link (e.g. https://whatsapp.com/channel/... or https://chat.whatsapp.com/...)" });
    }
  }

  if (telegramUrl !== undefined && telegramUrl !== "") {
    const isTgValid = /^(https?:\/\/)?(t\.me|telegram\.me|telegram\.org)\/.+/i.test(telegramUrl.trim());
    if (!isTgValid) {
      return res.status(400).json({ message: "Invalid Telegram URL. Must be a valid Telegram Channel link (e.g. https://t.me/... or https://telegram.me/...)" });
    }
  }

  if (siteLogo !== undefined) {
    db.prepare("INSERT OR REPLACE INTO site_settings (key, value, updatedAt) VALUES ('siteLogo', ?, ?)").run(String(siteLogo), now);
  }
  if (siteBackground !== undefined) {
    db.prepare("INSERT OR REPLACE INTO site_settings (key, value, updatedAt) VALUES ('siteBackground', ?, ?)").run(String(siteBackground), now);
  }
  if (whatsappUrl !== undefined) {
    db.prepare("INSERT OR REPLACE INTO site_settings (key, value, updatedAt) VALUES ('whatsappUrl', ?, ?)").run(String(whatsappUrl).trim(), now);
  }
  if (telegramUrl !== undefined) {
    db.prepare("INSERT OR REPLACE INTO site_settings (key, value, updatedAt) VALUES ('telegramUrl', ?, ?)").run(String(telegramUrl).trim(), now);
  }

  triggerRealtimeBackup(500);
  res.json({ message: "Website settings saved successfully!" });
}));


// AUTH ENDPOINTS
api.post("/auth/register", safe(async (req, res) => {
  const d = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) }).parse(req.body);
  const email = d.email.toLowerCase().trim();
  
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ message: "Email already registered" });
  
  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  const isSystemAdmin = (e: string) => {
    const clean = e.toLowerCase().trim();
    const admins = ["appua26145@gmail.com", "dddr04268@gmail.com"];
    if (process.env.ADMIN_EMAIL) {
      process.env.ADMIN_EMAIL.split(",").forEach(x => {
        const c = x.trim().toLowerCase();
        if (c && !admins.includes(c)) admins.push(c);
      });
    }
    return admins.includes(clean);
  };

  const isAdmin = count === 0 || isSystemAdmin(email);
  
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(d.password, 12);
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO users (id, name, email, password, role, activeSessionId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, d.name, email, hashedPassword, isAdmin ? "admin" : "user", sessionId, now);

  syncWriteToTurso(
    `INSERT OR REPLACE INTO users (id, name, email, password, avatar, role, subscriptionEndsAt, activeSessionId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, d.name, email, hashedPassword, "", isAdmin ? "admin" : "user", null, sessionId, now]
  );

  triggerRealtimeBackup();
  notifyTelegramUserRegistration(d.name, email);
  notifyTelegramCombinedUserProfile(userId);

  res.status(201).json({
    token: tokenFor(userId, isAdmin ? "admin" : "user", email, sessionId),
    user: { id: userId, name: d.name, email, role: isAdmin ? "admin" : "user" }
  });
}));

api.post("/auth/login", safe(async (req, res) => {
  const d = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const email = d.email.toLowerCase().trim();
  const password = d.password.trim();
  const u: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  
  if (!u || !(await bcrypt.compare(password, u.password))) {
    return res.status(401).json({ message: "Incorrect email or password" });
  }

  const isSystemAdmin = (e: string) => {
    const clean = e.toLowerCase().trim();
    const admins = ["appua26145@gmail.com", "dddr04268@gmail.com"];
    if (process.env.ADMIN_EMAIL) {
      process.env.ADMIN_EMAIL.split(",").forEach(x => {
        const c = x.trim().toLowerCase();
        if (c && !admins.includes(c)) admins.push(c);
      });
    }
    return admins.includes(clean);
  };

  let role = u.role;
  if (isSystemAdmin(email) && u.role !== "admin") {
    role = "admin";
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(u.id);
  }

  const sessionId = crypto.randomUUID();
  db.prepare("UPDATE users SET activeSessionId = ? WHERE id = ?").run(sessionId, u.id);
  syncWriteToTurso("UPDATE users SET activeSessionId = ? WHERE id = ?", [sessionId, u.id]);

  recordLoginHistory(u.id, req);

  res.json({
    token: tokenFor(u.id, role, email, sessionId),
    user: { id: u.id, name: u.name, email: u.email, role }
  });
}));

api.get("/auth/me", auth, safe(async (req: AuthRequest, res) => {
  const u: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.id);
  if (!u) return res.status(404).json({ message: "User not found" });

  const subscribed = isUserSubscribed(u.id);
  const userEmail = (u.email || "").toLowerCase().trim();
  const isMainAdmin = ADMIN_EMAILS.includes(userEmail) && u.role === "admin";

  const xpCoins = Number(u.xpCoins || 0);

  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isMainAdmin,
    avatar: u.avatar || "",
    subscriptionEndsAt: u.subscriptionEndsAt,
    isSubscribed: subscribed,
    xpCoins,
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isMainAdmin,
      avatar: u.avatar || "",
      subscriptionEndsAt: u.subscriptionEndsAt,
      isSubscribed: subscribed,
      xpCoins
    }
  });
}));

api.get("/me", auth, safe(async (req: AuthRequest, res) => {
  const u: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.id);
  if (!u) return res.status(404).json({ message: "User not found" });

  const subscribed = isUserSubscribed(u.id);
  const userEmail = (u.email || "").toLowerCase().trim();
  const isMainAdmin = ADMIN_EMAILS.includes(userEmail) && u.role === "admin";
  const xpCoins = Number(u.xpCoins || 0);

  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isMainAdmin,
    avatar: u.avatar || "",
    subscriptionEndsAt: u.subscriptionEndsAt,
    isSubscribed: subscribed,
    xpCoins,
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: u.role,
      isMainAdmin,
      avatar: u.avatar || "",
      subscriptionEndsAt: u.subscriptionEndsAt,
      isSubscribed: subscribed,
      xpCoins
    }
  });
}));

// LOGIN HISTORY LOGGER HELPER
const recordLoginHistory = (userId: string, req: any) => {
  try {
    const historyId = `lh_${crypto.randomUUID()}`;
    const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").toString();
    const ua = (req.headers["user-agent"] || "").toString();
    db.prepare("INSERT INTO login_history (id, userId, ipAddress, userAgent, createdAt) VALUES (?, ?, ?, ?, ?)").run(
      historyId, userId, ip, ua, new Date().toISOString()
    );
  } catch (e) {
    console.warn("[Login History Notice]:", e);
  }
};

// PROFILE SETTINGS & SECURITY ENDPOINTS
api.put("/me/profile", auth, safe(async (req: AuthRequest, res) => {
  const { name, phone } = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional()
  }).parse(req.body);

  const u: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.id);
  if (!u) return res.status(404).json({ message: "User not found" });

  const updatedName = name && name.trim() ? name.trim() : u.name;
  const updatedPhone = phone !== undefined ? phone.trim() : (u.phone || "");

  db.prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?").run(updatedName, updatedPhone, u.id);
  syncWriteToTurso("UPDATE users SET name = ?, phone = ? WHERE id = ?", [updatedName, updatedPhone, u.id]);

  res.json({ message: "Profile details updated successfully!", user: { ...u, name: updatedName, phone: updatedPhone } });
}));

api.put("/me/change-password", auth, safe(async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8)
  }).parse(req.body);

  const u: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.id);
  if (!u) return res.status(404).json({ message: "User not found" });

  const valid = await bcrypt.compare(currentPassword, u.password);
  if (!valid) return res.status(400).json({ message: "Current password is incorrect" });

  const hashed = await bcrypt.hash(newPassword, 12);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, u.id);
  syncWriteToTurso("UPDATE users SET password = ? WHERE id = ?", [hashed, u.id]);

  res.json({ message: "Password updated successfully!" });
}));

api.put("/me/avatar", auth, safe(async (req: AuthRequest, res) => {
  const { avatar } = z.object({ avatar: z.string() }).parse(req.body);
  const u: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.id);
  if (!u) return res.status(404).json({ message: "User not found" });

  db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, u.id);
  syncWriteToTurso("UPDATE users SET avatar = ? WHERE id = ?", [avatar, u.id]);

  res.json({ message: "Avatar updated successfully!", avatar });
}));

api.get("/me/login-history", auth, safe(async (req: AuthRequest, res) => {
  const rows = db.prepare("SELECT * FROM login_history WHERE userId = ? ORDER BY createdAt DESC LIMIT 20").all(req.user!.id);
  res.json({ history: rows });
}));

api.delete("/me/account", auth, safe(async (req: AuthRequest, res) => {
  const { password } = z.object({ password: z.string().min(1) }).parse(req.body);
  const u: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.id);
  if (!u) return res.status(404).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, u.password);
  if (!valid) return res.status(400).json({ message: "Password incorrect. Account deletion cancelled." });

  db.prepare("DELETE FROM users WHERE id = ?").run(u.id);
  syncWriteToTurso("DELETE FROM users WHERE id = ?", [u.id]);

  res.json({ message: "Your account has been deleted successfully." });
}));

// WATCH LATER ENDPOINTS
api.get("/watch-later", auth, safe(async (req: AuthRequest, res) => {
  const rows: any[] = db.prepare(`
    SELECT s.*, wl.createdAt as addedAt
    FROM watch_later wl
    JOIN series s ON wl.seriesId = s.id
    WHERE wl.userId = ?
    ORDER BY wl.createdAt DESC
  `).all(req.user!.id);
  res.json(rows);
}));

api.post("/watch-later/:seriesId", auth, safe(async (req: AuthRequest, res) => {
  const { seriesId } = req.params;
  const existing = db.prepare("SELECT * FROM watch_later WHERE userId = ? AND seriesId = ?").get(req.user!.id, seriesId);

  if (existing) {
    db.prepare("DELETE FROM watch_later WHERE userId = ? AND seriesId = ?").run(req.user!.id, seriesId);
    return res.json({ saved: false, message: "Removed from Watch Later" });
  } else {
    const id = `wl_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    db.prepare("INSERT INTO watch_later (id, userId, seriesId, createdAt) VALUES (?, ?, ?, ?)").run(id, req.user!.id, seriesId, now);
    return res.json({ saved: true, message: "Saved to Watch Later" });
  }
}));

// ADMIN CSV EXPORT
api.get("/admin/export/csv", auth, admin, safe(async (req, res) => {
  const subs: any[] = db.prepare(`
    SELECT s.id, u.email, u.name, s.plan, s.amount, s.startsAt, s.endsAt, s.status, s.paymentId
    FROM subscriptions s
    LEFT JOIN users u ON s.userId = u.id
    ORDER BY s.createdAt DESC
  `).all();

  let csv = "Subscription ID,User Email,User Name,Plan,Amount (INR),Start Date,Expiry Date,Status,Payment ID\n";
  subs.forEach((row) => {
    csv += `"${row.id}","${row.email || ''}","${row.name || ''}","${row.plan || ''}",${row.amount || 0},"${row.startsAt || ''}","${row.endsAt || ''}","${row.status || ''}","${row.paymentId || ''}"\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=subscriptions_report.csv");
  res.send(csv);
}));

api.post("/auth/google", safe(async (req, res) => {
  let email = req.body?.email;
  let name = req.body?.name;
  let avatar = req.body?.avatar;

  if (req.body?.credential && typeof req.body.credential === "string") {
    try {
      const parts = req.body.credential.split(".");
      if (parts.length >= 2) {
        const decoded = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        if (decoded?.email) {
          email = decoded.email;
          if (decoded.name) name = decoded.name;
          if (decoded.picture) avatar = decoded.picture;
        }
      }
    } catch (e) {
      console.error("[Google Auth] Error decoding credential token:", e);
    }
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ message: "Invalid email address received from Google" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const userName = (name && typeof name === "string" && name.trim()) ? name.trim() : cleanEmail.split("@")[0];
  let u: any = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);

  const isSystemAdmin = (e: string) => {
    const clean = e.toLowerCase().trim();
    const admins = ["appua26145@gmail.com", "dddr04268@gmail.com"];
    if (process.env.ADMIN_EMAIL) {
      process.env.ADMIN_EMAIL.split(",").forEach(x => {
        const c = x.trim().toLowerCase();
        if (c && !admins.includes(c)) admins.push(c);
      });
    }
    return admins.includes(clean);
  };

  const isAdmin = isSystemAdmin(cleanEmail);
  let role = isAdmin ? "admin" : "user";

  if (!u) {
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const randomPassword = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10);

    db.prepare(`
      INSERT INTO users (id, name, email, password, role, avatar, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, userName, cleanEmail, randomPassword, role, avatar || "", now);

    syncWriteToTurso(
      `INSERT OR REPLACE INTO users (id, name, email, password, avatar, role, subscriptionEndsAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, cleanEmail, randomPassword, avatar || "", role, null, now]
    );

    u = { id: userId, name: userName, email: cleanEmail, role, avatar: avatar || "" };
  } else {
    if (isAdmin && u.role !== "admin") {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(u.id);
      u.role = "admin";
    }
  }

  const sessionId = crypto.randomUUID();
  db.prepare("UPDATE users SET activeSessionId = ? WHERE id = ?").run(sessionId, u.id);
  syncWriteToTurso("UPDATE users SET activeSessionId = ? WHERE id = ?", [sessionId, u.id]);

  triggerRealtimeBackup();
  notifyTelegramGoogleLogin(u.name, cleanEmail);
  notifyTelegramCombinedUserProfile(u.id);

  res.json({
    token: tokenFor(u.id, u.role || role, u.email || cleanEmail, sessionId),
    user: { id: u.id, name: u.name, email: u.email, role: u.role || role, avatar: u.avatar || avatar }
  });
}));

api.post("/auth/forgot-password", (_q, r) =>
  r.json({ message: "If the account exists, password reset instructions have been sent." })
);


// SERIES & EXPLORE ENDPOINTS
api.get("/series", safe(async (req, res) => {
  let query = "SELECT * FROM series WHERE 1=1";
  const params: any[] = [];
  
  if (req.query.upcoming === "true") {
    query += " AND (isUpcoming = 1 OR LOWER(status) = 'upcoming')";
  } else if (req.query.upcoming === "false") {
    query += " AND (isUpcoming = 0 OR isUpcoming IS NULL) AND LOWER(status) != 'upcoming'";
  }

  if (req.query.isMovie === "true") {
    query += " AND isMovie = 1";
  } else if (req.query.isMovie === "false") {
    query += " AND (isMovie = 0 OR isMovie IS NULL)";
  }

  if (req.query.status) {
    query += " AND status = ?";
    params.push(req.query.status);
  }
  if (req.query.genre) {
    query += " AND genres LIKE ?";
    params.push(`%"${req.query.genre}"%`);
  }
  if (req.query.q) {
    query += " AND (title LIKE ? OR description LIKE ?)";
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }
  
  const limit = Math.min(Number(req.query.limit) || 60, 100);
  query += ` ORDER BY createdAt DESC LIMIT ${limit}`;
  
  const rows = db.prepare(query).all(...params);
  res.json(rows.map(formatSeries));
}));

api.get("/series/featured", safe(async (_q, r) => {
  const rows = db.prepare("SELECT * FROM series WHERE featured = 1 AND (isUpcoming = 0 OR isUpcoming IS NULL) ORDER BY createdAt DESC LIMIT 8").all();
  r.json(rows.map(formatSeries));
}));

api.get("/series/:slug", optionalAuth, safe(async (req: AuthRequest, res) => {
  const s: any = db.prepare("SELECT * FROM series WHERE slug = ? OR id = ?").get(req.params.slug, req.params.slug);
  if (!s) return res.status(404).json({ message: "Series not found" });

  const userId = req.user?.id;
  const userRole = req.user?.role;
  const isUserAdmin = Boolean(userRole === "admin" || userRole === "co_admin" || (req.user?.email && ADMIN_EMAILS.includes(req.user.email.toLowerCase().trim())));
  const subscribed = isUserSubscribed(userId);

  if (s.visibility === "private" && !isUserAdmin) {
    return res.status(403).json({ message: "This series is private." });
  }

  let unlockedEpisodeIds = new Set<string>();
  if (userId) {
    const unlocks: any[] = db.prepare("SELECT episodeId FROM episode_unlocks WHERE userId = ?").all(userId);
    unlockedEpisodeIds = new Set(unlocks.map((u: any) => String(u.episodeId)));
  }

  const episodes: any[] = db.prepare("SELECT * FROM episodes WHERE seriesId = ? ORDER BY number ASC").all(s.id);
  const formattedEpisodes = episodes.map((ep: any) => {
    const accessLower = String(ep.access || "public").toLowerCase().trim();
    const isXpCoins = accessLower === "xp_coins" || accessLower === "premium" || accessLower === "subscription";
    const isUnlocked = !isXpCoins || isUserAdmin || unlockedEpisodeIds.has(String(ep.id));

    return {
      ...formatEpisode(ep),
      access: isXpCoins ? "xp_coins" : "public",
      isUnlocked
    };
  });

  res.json({
    ...formatSeries(s),
    series: formatSeries(s),
    episodes: formattedEpisodes,
    isSubscribed: subscribed,
    isAdmin: isUserAdmin
  });
}));

api.get("/episodes/:id", optionalAuth, safe(async (req: AuthRequest, res) => {
  const e: any = db.prepare("SELECT * FROM episodes WHERE id = ?").get(req.params.id);
  if (!e) return res.status(404).json({ message: "Episode not found" });

  const s: any = db.prepare("SELECT * FROM series WHERE id = ?").get(e.seriesId);
  
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const isUserAdmin = Boolean(userRole === "admin" || userRole === "co_admin" || (req.user?.email && ADMIN_EMAILS.includes(req.user.email.toLowerCase().trim())));

  const seriesVis = String(s?.visibility || "public").toLowerCase().trim();
  const epVis = String(e.visibility || "public").toLowerCase().trim();
  const epAccess = String(e.access || "free").toLowerCase().trim();
  
  const isXpCoinsRequired = epAccess === "xp_coins" || epAccess === "premium" || epAccess === "subscription";
  const xpCost = isXpCoinsRequired ? Math.max(1, Number(e.xpCost || 5)) : 0;
  const isPrivateOnly = seriesVis === "private" || epVis === "private";

  let isUnlocked = !isXpCoinsRequired;
  let userCoins = 0;

  if (userId) {
    const userDb: any = db.prepare("SELECT xpCoins FROM users WHERE id = ?").get(userId);
    userCoins = Number(userDb?.xpCoins || 0);

    if (isXpCoinsRequired) {
      const unlockRow = db.prepare("SELECT id FROM episode_unlocks WHERE userId = ? AND episodeId = ?").get(userId, e.id);
      if (unlockRow) isUnlocked = true;
    }
  }

  if (isPrivateOnly && !isUserAdmin) {
    return res.status(403).json({
      isPrivate: true,
      restricted: true,
      message: "This video is restricted and can only be viewed by an administrator.",
      series: formatSeries(s),
      title: e.title
    });
  }

  if (isXpCoinsRequired && !isUserAdmin && !isUnlocked) {
    return res.status(403).json({
      message: `This episode requires ${xpCost} XP Coins to unlock.`,
      paywall: true,
      isXpCoinsRequired: true,
      xpCost,
      isUnlocked: false,
      userCoins,
      errorStatus: 403,
      series: formatSeries(s),
      title: e.title
    });
  }

  // Fetch previous & next episode in series
  const allSeriesEpisodes = db.prepare("SELECT * FROM episodes WHERE seriesId = ? ORDER BY number ASC").all(e.seriesId);
  const currentIndex = allSeriesEpisodes.findIndex((item: any) => item.id === e.id);
  const prevEp = currentIndex > 0 ? formatEpisode(allSeriesEpisodes[currentIndex - 1]) : null;
  const nextEp = currentIndex >= 0 && currentIndex < allSeriesEpisodes.length - 1 ? formatEpisode(allSeriesEpisodes[currentIndex + 1]) : null;

  // Fetch saved watch progress for logged-in user
  let savedProgress: any = null;
  if (userId) {
    savedProgress = db.prepare("SELECT * FROM watch_history WHERE userId = ? AND episodeId = ?").get(userId, e.id);
  }

  res.json({
    ...formatEpisode(e),
    series: formatSeries(s),
    prevEpisode: prevEp,
    nextEpisode: nextEp,
    access: isXpCoinsRequired ? "xp_coins" : "free",
    xpCost: isXpCoinsRequired ? xpCost : 0,
    isUnlocked: !isXpCoinsRequired || isUnlocked || isUserAdmin,
    userCoins,
    savedProgress: savedProgress ? {
      currentPosition: savedProgress.currentPosition || 0,
      duration: savedProgress.duration || 0,
      percentage: savedProgress.percentage || 0,
      completed: Boolean(savedProgress.completed),
      updatedAt: savedProgress.updatedAt
    } : null
  });
}));

// EPISODE VIEW RECORDING ENDPOINT
api.post("/episodes/:id/view", safe(async (req: AuthRequest, res) => {
  const episodeId = req.params.id;
  const sessionId = String(req.body?.sessionId || req.headers["x-session-id"] || "").trim();
  const userId = req.user?.id || "";

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID required" });
  }

  const ep: any = db.prepare("SELECT id, seriesId, views FROM episodes WHERE id = ?").get(episodeId);
  if (!ep) {
    return res.status(404).json({ message: "Episode not found" });
  }

  const existing = db.prepare("SELECT id FROM episode_view_events WHERE episodeId = ? AND sessionId = ?").get(episodeId, sessionId);
  if (existing) {
    return res.json({ recorded: false, views: Number(ep.views || 0) });
  }

  const eventId = `ve_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  try {
    db.prepare("INSERT OR IGNORE INTO episode_view_events (id, episodeId, userId, sessionId, createdAt) VALUES (?, ?, ?, ?, ?)").run(eventId, episodeId, userId, sessionId, now);
    db.prepare("UPDATE episodes SET views = COALESCE(views, 0) + 1 WHERE id = ?").run(episodeId);
    if (ep.seriesId) {
      db.prepare("UPDATE series SET views = COALESCE(views, 0) + 1 WHERE id = ?").run(ep.seriesId);
    }
  } catch {}

  const updated: any = db.prepare("SELECT views FROM episodes WHERE id = ?").get(episodeId);
  res.json({ recorded: true, views: Number(updated?.views || 0) });
}));

// EPISODE TOGGLE LIKE ENDPOINT
api.post("/episodes/:id/like", auth, safe(async (req: AuthRequest, res) => {
  const episodeId = req.params.id;
  const userId = req.user!.id;

  const ep: any = db.prepare("SELECT id FROM episodes WHERE id = ?").get(episodeId);
  if (!ep) {
    return res.status(404).json({ message: "Episode not found" });
  }

  const existing = db.prepare("SELECT id FROM episode_likes WHERE episodeId = ? AND userId = ?").get(episodeId, userId);
  let liked = false;

  if (existing) {
    db.prepare("DELETE FROM episode_likes WHERE episodeId = ? AND userId = ?").run(episodeId, userId);
    liked = false;
  } else {
    const likeId = `like_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    db.prepare("INSERT OR IGNORE INTO episode_likes (id, episodeId, userId, createdAt) VALUES (?, ?, ?, ?)").run(likeId, episodeId, userId, now);
    liked = true;
  }

  const countRow: any = db.prepare("SELECT COUNT(*) as cnt FROM episode_likes WHERE episodeId = ?").get(episodeId);
  const likesCount = Number(countRow?.cnt || 0);
  db.prepare("UPDATE episodes SET likesCount = ? WHERE id = ?").run(likesCount, episodeId);

  res.json({ liked, likesCount });
}));

// EPISODE UNLOCK ENDPOINT
api.post("/episodes/:id/unlock", auth, safe(async (req: AuthRequest, res) => {
  const episodeId = req.params.id;
  const userId = req.user!.id;

  const ep: any = db.prepare("SELECT e.*, s.title as seriesTitle FROM episodes e JOIN series s ON e.seriesId = s.id WHERE e.id = ?").get(episodeId);
  if (!ep) {
    return res.status(404).json({ message: "Episode not found" });
  }

  const accessType = String(ep.access || "free").toLowerCase().trim();
  const isXpCoinsRequired = accessType === "xp_coins" || accessType === "premium" || accessType === "subscription";
  if (!isXpCoinsRequired) {
    return res.json({ success: true, message: "This episode is free!" });
  }

  // 1. Check if user already unlocked this episode
  const existingUnlock: any = db.prepare("SELECT id FROM episode_unlocks WHERE userId = ? AND episodeId = ?").get(userId, episodeId);
  if (existingUnlock) {
    const u: any = db.prepare("SELECT xpCoins FROM users WHERE id = ?").get(userId);
    return res.json({
      success: true,
      message: "Episode is already unlocked!",
      alreadyUnlocked: true,
      xpCoins: Number(u?.xpCoins || 0)
    });
  }

  // 2. Validate User XP Coin Balance
  const u: any = db.prepare("SELECT id, xpCoins FROM users WHERE id = ?").get(userId);
  const currentCoins = Number(u?.xpCoins || 0);
  const xpCost = Math.max(1, Number(ep.xpCost || 5));

  if (currentCoins < xpCost) {
    return res.status(400).json({
      message: "Not enough XP Coins.",
      insufficientCoins: true,
      requiredCoins: xpCost,
      userCoins: currentCoins
    });
  }

  const balanceBefore = currentCoins;

  // 3. Atomic Balance Deduction (SQLite + Turso Cloud sync)
  db.prepare("UPDATE users SET xpCoins = xpCoins - ? WHERE id = ? AND xpCoins >= ?").run(xpCost, userId, xpCost);
  syncWriteToTurso("UPDATE users SET xpCoins = xpCoins - ? WHERE id = ? AND xpCoins >= ?", [xpCost, userId, xpCost]);

  const updatedUser: any = db.prepare("SELECT xpCoins FROM users WHERE id = ?").get(userId);
  const balanceAfter = Number(updatedUser?.xpCoins ?? (balanceBefore - xpCost));

  const unlockId = `unlock_${crypto.randomUUID()}`;
  const txId = `tx_unlock_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // 4. Create permanent episode unlock record
  db.prepare("INSERT INTO episode_unlocks (id, userId, episodeId, coinsPaid, unlockedAt) VALUES (?, ?, ?, ?, ?)").run(unlockId, userId, episodeId, xpCost, now);
  syncWriteToTurso("INSERT INTO episode_unlocks (id, userId, episodeId, coinsPaid, unlockedAt) VALUES (?, ?, ?, ?, ?)", [unlockId, userId, episodeId, xpCost, now]);

  // 5. Record Transaction Ledger
  const desc = `Unlocked Episode ${ep.number}: ${ep.title} (${ep.seriesTitle})`;
  db.prepare("INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'EPISODE_UNLOCK', ?, ?, ?, ?, ?, ?)").run(txId, userId, -xpCost, balanceBefore, balanceAfter, desc, unlockId, now);
  syncWriteToTurso("INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'EPISODE_UNLOCK', ?, ?, ?, ?, ?, ?)", [txId, userId, -xpCost, balanceBefore, balanceAfter, desc, unlockId, now]);

  res.json({
    success: true,
    message: `✓ Unlocked for ${xpCost} XP Coins!`,
    xpCoins: balanceAfter,
    unlockedEpisodeId: episodeId
  });
}));

// WATCH REMAINING & PROGRESS SYNC
api.post("/history/progress", auth, safe(async (req: AuthRequest, res) => {
  const { episodeId, currentPosition, duration } = z.object({
    episodeId: z.string(),
    currentPosition: z.number().nonnegative(),
    duration: z.number().nonnegative().optional().default(0)
  }).parse(req.body);

  const now = new Date().toISOString();
  let percentage = duration > 0 ? Math.min(100, Math.round((currentPosition / duration) * 100)) : 0;
  
  // Mark completed if >= 90% watched
  let completed = percentage >= 90 ? 1 : 0;

  const existing: any = db.prepare("SELECT * FROM watch_history WHERE userId = ? AND episodeId = ?").get(req.user!.id, episodeId);

  if (existing) {
    db.prepare(`
      UPDATE watch_history SET
        currentPosition = ?,
        duration = ?,
        percentage = ?,
        progress = ?,
        completed = ?,
        lastWatched = ?,
        updatedAt = ?
      WHERE userId = ? AND episodeId = ?
    `).run(currentPosition, duration, percentage, percentage, completed, now, now, req.user!.id, episodeId);
  } else {
    db.prepare(`
      INSERT INTO watch_history (id, userId, episodeId, currentPosition, duration, percentage, progress, completed, lastWatched, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), req.user!.id, episodeId, currentPosition, duration, percentage, percentage, completed, now, now);
  }

  triggerRealtimeBackup(10000);

  res.json({ success: true, episodeId, currentPosition, percentage, completed });
}));

api.get("/history/continue-watching", auth, safe(async (req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT h.id as histId, h.currentPosition, h.duration, h.percentage, h.updatedAt, h.lastWatched,
           e.id as epId, e.number, e.title as epTitle, e.duration as epDurationText, e.thumbnail as epThumbnail,
           s.id as seriesId, s.title as seriesTitle, s.slug as seriesSlug, s.thumbnail as seriesThumbnail, s.banner as seriesBanner
    FROM watch_history h
    JOIN episodes e ON h.episodeId = e.id
    JOIN series s ON e.seriesId = s.id
    WHERE h.userId = ? AND h.completed = 0 AND h.percentage > 0 AND h.percentage < 90
    ORDER BY h.updatedAt DESC
    LIMIT 20
  `).all(req.user!.id);

  const continueItems = rows.map((r: any) => {
    const totalSec = r.duration > 0 ? r.duration : 1200; // fallback default duration estimation
    const remainingSec = Math.max(0, totalSec - r.currentPosition);
    const remainingMin = Math.ceil(remainingSec / 60);

    return {
      _id: r.histId,
      episodeId: r.epId,
      episodeNumber: r.number,
      episodeTitle: r.epTitle,
      seriesId: r.seriesId,
      seriesTitle: r.seriesTitle,
      seriesSlug: r.seriesSlug,
      thumbnail: r.epThumbnail || r.seriesThumbnail || r.seriesBanner || "",
      currentPosition: r.currentPosition,
      duration: totalSec,
      percentage: r.percentage,
      remainingMinutes: remainingMin,
      lastWatched: r.lastWatched || r.updatedAt
    };
  });

  res.json(continueItems);
}));

// UPCOMING CONTENT SECTION API
api.get("/upcoming", safe(async (_req, res) => {
  const now = new Date().toISOString();
  // Auto-migrate past upcoming items to active list
  db.prepare("UPDATE series SET isUpcoming = 0 WHERE isUpcoming = 1 AND releaseDate IS NOT NULL AND releaseDate <= ?").run(now);
  db.prepare("UPDATE episodes SET isUpcoming = 0 WHERE isUpcoming = 1 AND releaseDate IS NOT NULL AND releaseDate <= ?").run(now);

  const seriesUpcoming = db.prepare("SELECT * FROM series WHERE isUpcoming = 1 ORDER BY releaseDate ASC, createdAt DESC").all();
  const episodesUpcoming = db.prepare(`
    SELECT e.*, s.title as seriesTitle, s.slug as seriesSlug, s.thumbnail as seriesThumbnail
    FROM episodes e
    JOIN series s ON e.seriesId = s.id
    WHERE e.isUpcoming = 1
    ORDER BY e.releaseDate ASC, e.createdAt DESC
  `).all();

  res.json({
    series: seriesUpcoming.map(formatSeries),
    episodes: episodesUpcoming.map((e: any) => ({ ...formatEpisode(e), seriesTitle: e.seriesTitle, seriesSlug: e.seriesSlug }))
  });
}));

// POPULAR & TRENDING RANKINGS API
api.get("/popular", safe(async (_req, res) => {
  const topSeries = db.prepare("SELECT * FROM series WHERE (isUpcoming = 0 OR isUpcoming IS NULL) ORDER BY clicks DESC, views DESC LIMIT 10").all();
  const topMovies = db.prepare("SELECT * FROM series WHERE isMovie = 1 AND (isUpcoming = 0 OR isUpcoming IS NULL) ORDER BY clicks DESC, views DESC LIMIT 10").all();
  
  const trendingToday = db.prepare("SELECT * FROM series WHERE (isUpcoming = 0 OR isUpcoming IS NULL) ORDER BY views DESC, createdAt DESC LIMIT 10").all();
  const trendingWeek = db.prepare("SELECT * FROM series WHERE (isUpcoming = 0 OR isUpcoming IS NULL) ORDER BY trending DESC, clicks DESC LIMIT 10").all();
  const trendingMonth = db.prepare("SELECT * FROM series WHERE (isUpcoming = 0 OR isUpcoming IS NULL) ORDER BY featured DESC, views DESC LIMIT 10").all();

  res.json({
    topSeries: topSeries.map(formatSeries),
    topMovies: topMovies.map(formatSeries),
    trendingToday: trendingToday.map(formatSeries),
    trendingWeek: trendingWeek.map(formatSeries),
    trendingMonth: trendingMonth.map(formatSeries)
  });
}));

// EPISODE COMMENTS SYSTEM API
api.get("/episodes/:id/comments", optionalAuth, safe(async (req: AuthRequest, res) => {
  const episodeId = req.params.id;
  const sort = (req.query.sort as string) || "newest"; // "top", "newest", "oldest"
  const currentUserId = req.user?.id;

  let orderBy = "c.createdAt DESC";
  if (sort === "top") orderBy = "c.likesCount DESC, c.createdAt DESC";
  if (sort === "oldest") orderBy = "c.createdAt ASC";

  const rows = db.prepare(`
    SELECT c.*, u.name as userName, u.avatar as userAvatar, u.role as userRole,
           (SELECT COUNT(*) FROM comment_likes cl WHERE cl.commentId = c.id AND cl.userId = ?) as userLiked
    FROM comments c
    JOIN users u ON c.userId = u.id
    WHERE c.episodeId = ?
    ORDER BY c.isPinned DESC, ${orderBy}
  `).all(currentUserId || "", episodeId);

  // Separate top-level comments and replies
  const commentsMap = new Map<string, any>();
  const topLevel: any[] = [];

  rows.forEach((r: any) => {
    const item = {
      id: r.id,
      episodeId: r.episodeId,
      userId: r.userId,
      parentId: r.parentId,
      content: r.content,
      likesCount: r.likesCount || 0,
      isPinned: Boolean(r.isPinned),
      userLiked: Boolean(r.userLiked),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: {
        id: r.userId,
        name: r.userName,
        avatar: r.userAvatar || "",
        role: r.userRole
      },
      replies: []
    };
    commentsMap.set(r.id, item);
  });

  commentsMap.forEach((comment) => {
    if (comment.parentId && commentsMap.has(comment.parentId)) {
      commentsMap.get(comment.parentId).replies.push(comment);
    } else {
      topLevel.push(comment);
    }
  });

  res.json(topLevel);
}));

api.post("/episodes/:id/comments", optionalAuth, safe(async (req: AuthRequest, res) => {
  const episodeId = req.params.id;
  const { content, parentId, guestName } = z.object({
    content: z.string().min(1).max(2000),
    parentId: z.string().optional(),
    guestName: z.string().max(50).optional()
  }).parse(req.body);

  const cleanText = content.trim();
  if (cleanText.length === 0) {
    return res.status(400).json({ message: "Comment content cannot be empty." });
  }

  // Resolve user identity (authenticated user or guest viewer)
  let activeUserId = req.user?.id;
  let activeUserName = "";
  let activeUserAvatar = "";
  let activeUserRole = req.user?.role || "user";

  if (activeUserId) {
    const u: any = db.prepare("SELECT name, avatar, role FROM users WHERE id = ?").get(activeUserId);
    if (u) {
      activeUserName = u.name;
      activeUserAvatar = u.avatar || "";
      activeUserRole = u.role;
    }
  } else {
    // Generate/resolve persistent guest user account
    const cleanGuestName = (guestName || "Guest Viewer").trim();
    const guestHash = crypto.createHash("md5").update(cleanGuestName + (req.ip || "guest")).digest("hex").substring(0, 12);
    activeUserId = `guest_${guestHash}`;

    const existingGuest: any = db.prepare("SELECT * FROM users WHERE id = ?").get(activeUserId);
    if (!existingGuest) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, avatar, createdAt)
        VALUES (?, ?, ?, ?, 'user', '', ?)
      `).run(activeUserId, cleanGuestName, `${activeUserId}@guest.local`, "guest-nopass", now);
    }
    activeUserName = cleanGuestName;
  }

  // Anti-Spam Check: Duplicate post in last 60s
  const sixtySecsAgo = new Date(Date.now() - 60000).toISOString();
  const duplicate = db.prepare(`
    SELECT * FROM comments 
    WHERE episodeId = ? AND userId = ? AND content = ? AND createdAt > ?
  `).get(episodeId, activeUserId, cleanText, sixtySecsAgo);

  if (duplicate) {
    return res.status(400).json({ message: "You have already posted this exact comment recently." });
  }

  const now = new Date().toISOString();

  // Ensure target episode container exists to satisfy Foreign Key constraints
  let ep: any = db.prepare("SELECT * FROM episodes WHERE id = ?").get(episodeId);
  if (!ep) {
    let series: any = db.prepare("SELECT * FROM series WHERE id = ? OR slug = ?").get(episodeId, episodeId);
    let targetSeriesId = series ? series.id : `series_${episodeId}`;
    if (!series) {
      db.prepare(`
        INSERT OR IGNORE INTO series (id, title, slug, description, createdAt)
        VALUES (?, 'Explainer Series', ?, 'Official Explainer Series', ?)
      `).run(targetSeriesId, targetSeriesId, now);
    }
    db.prepare(`
      INSERT OR IGNORE INTO episodes (id, seriesId, number, title, rumbleEmbedUrl, createdAt)
      VALUES (?, ?, 1, 'Explainer Episode', '', ?)
    `).run(episodeId, targetSeriesId, now);
    ep = db.prepare("SELECT * FROM episodes WHERE id = ?").get(episodeId);
  }

  if (ep) {
    if (ep.commentsDisabled && activeUserRole !== "admin") {
      return res.status(403).json({ message: "Comments are disabled for this episode." });
    }
    if (ep.commentsLocked && activeUserRole !== "admin") {
      return res.status(403).json({ message: "Comments are locked for this episode." });
    }
  }

  const commentId = crypto.randomUUID();
  const sanitizedContent = cleanText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  db.prepare(`
    INSERT INTO comments (id, episodeId, userId, parentId, content, likesCount, isPinned, isHidden, isEdited, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
  `).run(commentId, episodeId, activeUserId, parentId || null, sanitizedContent, now, now);

  // Send Notification if replying to another user's comment
  if (parentId) {
    const parentComment: any = db.prepare("SELECT userId FROM comments WHERE id = ?").get(parentId);
    if (parentComment && parentComment.userId && parentComment.userId !== activeUserId) {
      db.prepare(`
        INSERT INTO notifications (id, userId, actorId, type, commentId, episodeId, message, isRead, createdAt)
        VALUES (?, ?, ?, 'reply', ?, ?, ?, 0, ?)
      `).run(
        crypto.randomUUID(),
        parentComment.userId,
        activeUserId,
        commentId,
        episodeId,
        `${activeUserName} replied to your comment!`,
        now
      );
    }
  }

  triggerRealtimeBackup();

  res.status(201).json({
    id: commentId,
    episodeId,
    userId: activeUserId,
    parentId: parentId || null,
    content: sanitizedContent,
    likesCount: 0,
    isPinned: false,
    isHidden: false,
    isEdited: false,
    userLiked: false,
    createdAt: now,
    updatedAt: now,
    user: {
      id: activeUserId,
      name: activeUserName,
      avatar: activeUserAvatar,
      role: activeUserRole
    },
    replies: []
  });
}));

api.patch("/comments/:id", auth, safe(async (req: AuthRequest, res) => {
  const comment: any = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  if (comment.userId !== req.user!.id && req.user!.role !== "admin") {
    return res.status(403).json({ message: "You can only edit your own comment" });
  }

  const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body);
  const cleanContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const now = new Date().toISOString();

  db.prepare("UPDATE comments SET content = ?, updatedAt = ? WHERE id = ?").run(cleanContent, now, req.params.id);

  res.json({ id: req.params.id, content: cleanContent, updatedAt: now });
}));

api.delete("/comments/:id", auth, safe(async (req: AuthRequest, res) => {
  const comment: any = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  if (comment.userId !== req.user!.id && req.user!.role !== "admin") {
    return res.status(403).json({ message: "You are not allowed to delete this comment" });
  }

  db.prepare("DELETE FROM comments WHERE id = ? OR parentId = ?").run(req.params.id, req.params.id);
  res.status(204).end();
}));

api.post("/comments/:id/like", auth, safe(async (req: AuthRequest, res) => {
  const comment: any = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  const existing = db.prepare("SELECT * FROM comment_likes WHERE commentId = ? AND userId = ?").get(req.params.id, req.user!.id);
  const now = new Date().toISOString();

  let liked = false;
  if (existing) {
    db.prepare("DELETE FROM comment_likes WHERE commentId = ? AND userId = ?").run(req.params.id, req.user!.id);
    db.prepare("UPDATE comments SET likesCount = MAX(0, likesCount - 1) WHERE id = ?").run(req.params.id);
    liked = false;
  } else {
    db.prepare("INSERT INTO comment_likes (commentId, userId, createdAt) VALUES (?, ?, ?)").run(req.params.id, req.user!.id, now);
    db.prepare("UPDATE comments SET likesCount = likesCount + 1 WHERE id = ?").run(req.params.id);
    liked = true;
  }

  const updated: any = db.prepare("SELECT likesCount FROM comments WHERE id = ?").get(req.params.id);
  res.json({ liked, likesCount: updated?.likesCount || 0 });
}));

api.post("/comments/:id/pin", auth, admin, safe(async (req, res) => {
  const comment: any = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  const newPinState = comment.isPinned ? 0 : 1;
  db.prepare("UPDATE comments SET isPinned = ? WHERE id = ?").run(newPinState, req.params.id);

  res.json({ isPinned: Boolean(newPinState) });
}));

// 5-STAR SERIES REVIEWS & RATING ENDPOINTS
api.get("/series/:slug/reviews", optionalAuth, safe(async (req: AuthRequest, res) => {
  const series: any = db.prepare("SELECT id FROM series WHERE slug = ? OR id = ?").get(req.params.slug, req.params.slug);
  if (!series) return res.status(404).json({ message: "Series not found" });

  const currentUserId = req.user?.id;

  try {
    db.exec("ALTER TABLE reviews ADD COLUMN isPinned INTEGER DEFAULT 0");
  } catch {}

  const rows: any[] = db.prepare(`
    SELECT 
      r.id,
      r.seriesId,
      r.userId,
      r.rating,
      r.comment,
      r.upvotes,
      r.isPinned,
      r.createdAt,
      u.name as userName,
      u.avatar as userAvatar,
      u.subscriptionEndsAt
    FROM reviews r
    LEFT JOIN users u ON r.userId = u.id
    WHERE r.seriesId = ?
    ORDER BY r.isPinned DESC, r.createdAt DESC
  `).all(series.id);

  let userUpvotedIds = new Set<string>();
  if (currentUserId) {
    const upvotedRows: any[] = db.prepare("SELECT reviewId FROM review_upvotes WHERE userId = ?").all(currentUserId);
    userUpvotedIds = new Set(upvotedRows.map((u) => u.reviewId));
  }

  const totalReviews = rows.length;
  let sumRating = 0;
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const reviews = rows.map((r) => {
    sumRating += r.rating;
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[r.rating as 1|2|3|4|5]++;
    }

    const expMs = r.subscriptionEndsAt ? new Date(r.subscriptionEndsAt).getTime() : 0;
    const isVip = expMs > Date.now();

    return {
      id: r.id,
      seriesId: r.seriesId,
      userId: r.userId,
      userName: r.userName || "Subscriber",
      userAvatar: r.userAvatar || "",
      isVip,
      rating: r.rating,
      comment: r.comment,
      upvotes: r.upvotes || 0,
      isPinned: Boolean(r.isPinned),
      hasUpvoted: userUpvotedIds.has(r.id),
      createdAt: r.createdAt
    };
  });

  const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 5.0;

  res.json({
    averageRating,
    totalReviews,
    ratingDistribution,
    reviews
  });
}));

api.post("/series/:slug/reviews", auth, safe(async (req: AuthRequest, res) => {
  const { rating, comment } = z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().min(2).max(2000)
  }).parse(req.body);

  const series: any = db.prepare("SELECT id FROM series WHERE slug = ? OR id = ?").get(req.params.slug, req.params.slug);
  if (!series) return res.status(404).json({ message: "Series not found" });

  const userId = req.user!.id;
  const cleanComment = comment.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const now = new Date().toISOString();

  const existing: any = db.prepare("SELECT id FROM reviews WHERE seriesId = ? AND userId = ?").get(series.id, userId);

  if (existing) {
    db.prepare("UPDATE reviews SET rating = ?, comment = ?, createdAt = ? WHERE id = ?").run(rating, cleanComment, now, existing.id);
  } else {
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO reviews (id, seriesId, userId, rating, comment, upvotes, isPinned, createdAt) VALUES (?, ?, ?, ?, ?, 0, 0, ?)").run(
      id, series.id, userId, rating, cleanComment, now
    );
  }

  triggerRealtimeBackup(300);
  res.json({ success: true, message: "Review posted successfully!" });
}));

api.patch("/reviews/:id", auth, safe(async (req: AuthRequest, res) => {
  const review: any = db.prepare("SELECT * FROM reviews WHERE id = ?").get(req.params.id);
  if (!review) return res.status(404).json({ message: "Review not found" });

  if (review.userId !== req.user!.id && req.user!.role !== "admin") {
    return res.status(403).json({ message: "You can only edit your own review" });
  }

  const { comment, rating } = z.object({
    comment: z.string().min(2).max(2000),
    rating: z.number().min(1).max(5).optional()
  }).parse(req.body);

  const cleanComment = comment.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const newRating = rating || review.rating;
  const now = new Date().toISOString();

  db.prepare("UPDATE reviews SET comment = ?, rating = ?, createdAt = ? WHERE id = ?").run(cleanComment, newRating, now, req.params.id);

  res.json({ id: req.params.id, comment: cleanComment, rating: newRating, updatedAt: now });
}));

api.delete("/reviews/:id", auth, safe(async (req: AuthRequest, res) => {
  const review: any = db.prepare("SELECT * FROM reviews WHERE id = ?").get(req.params.id);
  if (!review) return res.status(404).json({ message: "Review not found" });

  if (review.userId !== req.user!.id && req.user!.role !== "admin") {
    return res.status(403).json({ message: "You can only delete your own review" });
  }

  db.prepare("DELETE FROM reviews WHERE id = ?").run(req.params.id);
  db.prepare("DELETE FROM review_upvotes WHERE reviewId = ?").run(req.params.id);

  res.status(204).end();
}));

api.post("/reviews/:id/pin", auth, admin, safe(async (req, res) => {
  const review: any = db.prepare("SELECT * FROM reviews WHERE id = ?").get(req.params.id);
  if (!review) return res.status(404).json({ message: "Review not found" });

  const newPinState = review.isPinned ? 0 : 1;

  if (newPinState === 1) {
    db.prepare("UPDATE reviews SET isPinned = 0 WHERE seriesId = ?").run(review.seriesId);
  }

  db.prepare("UPDATE reviews SET isPinned = ? WHERE id = ?").run(newPinState, req.params.id);

  res.json({ isPinned: Boolean(newPinState) });
}));

api.post("/reviews/:id/upvote", auth, safe(async (req: AuthRequest, res) => {
  const review: any = db.prepare("SELECT * FROM reviews WHERE id = ?").get(req.params.id);
  if (!review) return res.status(404).json({ message: "Review not found" });

  const userId = req.user!.id;
  const existing = db.prepare("SELECT * FROM review_upvotes WHERE reviewId = ? AND userId = ?").get(req.params.id, userId);
  const now = new Date().toISOString();

  let hasUpvoted = false;
  if (existing) {
    db.prepare("DELETE FROM review_upvotes WHERE reviewId = ? AND userId = ?").run(req.params.id, userId);
    db.prepare("UPDATE reviews SET upvotes = MAX(0, upvotes - 1) WHERE id = ?").run(req.params.id);
    hasUpvoted = false;
  } else {
    db.prepare("INSERT INTO review_upvotes (id, reviewId, userId, createdAt) VALUES (?, ?, ?, ?)").run(
      crypto.randomUUID(), req.params.id, userId, now
    );
    db.prepare("UPDATE reviews SET upvotes = upvotes + 1 WHERE id = ?").run(req.params.id);
    hasUpvoted = true;
  }

  const updated: any = db.prepare("SELECT upvotes FROM reviews WHERE id = ?").get(req.params.id);
  res.json({ hasUpvoted, upvotes: updated?.upvotes || 0 });
}));

api.get("/notifications", auth, safe(async (req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT n.*, u.name as actorName, u.avatar as actorAvatar
    FROM notifications n
    JOIN users u ON n.actorId = u.id
    WHERE n.userId = ?
    ORDER BY n.createdAt DESC
    LIMIT 50
  `).all(req.user!.id);
  res.json(rows);
}));

api.get("/categories", safe(async (_q, r) => {
  const rows = db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
  r.json(rows.map((c: any) => ({ ...c, _id: c.id })));
}));



api.get("/search", safe(async (req, res) => {
  const q = String(req.query.q || "");
  const rows = db.prepare("SELECT * FROM series WHERE title LIKE ? OR genres LIKE ? LIMIT 30").all(`%${q}%`, `%${q}%`);
  res.json(rows.map(formatSeries));
}));

// USER PROFILE & HISTORY ENDPOINTS
const getMeHandler = safe(async (req: AuthRequest, res: any) => {
  const u: any = db.prepare("SELECT id, name, email, role, avatar, subscriptionEndsAt FROM users WHERE id = ?").get(req.user!.id);
  if (!u) return res.status(404).json({ message: "User not found" });

  const favRows = db.prepare(`
    SELECT f.id as favId, s.* 
    FROM favorites f 
    JOIN series s ON f.seriesId = s.id 
    WHERE f.userId = ?
  `).all(u.id);

  const histRows = db.prepare(`
    SELECT h.id as histId, h.progress, h.updatedAt, e.id as epId, e.number, e.title as epTitle, e.duration, s.id as seriesId, s.title as seriesTitle, s.slug as seriesSlug
    FROM watch_history h
    JOIN episodes e ON h.episodeId = e.id
    JOIN series s ON e.seriesId = s.id
    WHERE h.userId = ?
    ORDER BY h.updatedAt DESC
  `).all(u.id);

  res.json({
    ...u,
    _id: u.id,
    user: { ...u, _id: u.id },
    favorites: favRows.map((f: any) => ({ _id: f.favId, series: formatSeries(f) })),
    history: histRows.map((h: any) => ({
      _id: h.histId,
      progress: h.progress,
      episode: {
        _id: h.epId,
        number: h.number,
        title: h.epTitle,
        duration: h.duration,
        series: { id: h.seriesId, title: h.seriesTitle, slug: h.seriesSlug }
      }
    }))
  });
});

api.get("/me", auth, getMeHandler);
api.get("/auth/me", auth, getMeHandler);

api.post("/favorites/:seriesId", auth, safe(async (req: AuthRequest, res) => {
  const existing = db.prepare("SELECT * FROM favorites WHERE userId = ? AND seriesId = ?").get(req.user!.id, req.params.seriesId);
  if (existing) {
    db.prepare("DELETE FROM favorites WHERE userId = ? AND seriesId = ?").run(req.user!.id, req.params.seriesId);
    syncWriteToTurso("DELETE FROM favorites WHERE userId = ? AND seriesId = ?", [req.user!.id, req.params.seriesId]);
    return res.json({ favorite: false });
  }
  const favId = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO favorites (id, userId, seriesId, createdAt) VALUES (?, ?, ?, ?)").run(favId, req.user!.id, req.params.seriesId, now);
  syncWriteToTurso("INSERT OR REPLACE INTO favorites (id, userId, seriesId, createdAt) VALUES (?, ?, ?, ?)", [favId, req.user!.id, req.params.seriesId, now]);
  res.status(201).json({ favorite: true });
}));

api.post("/history/:episodeId", auth, safe(async (req: AuthRequest, res) => {
  const now = new Date().toISOString();
  const progress = Number(req.body.progress || 0);
  const existing: any = db.prepare("SELECT * FROM watch_history WHERE userId = ? AND episodeId = ?").get(req.user!.id, req.params.episodeId);
  
  if (existing) {
    db.prepare("UPDATE watch_history SET progress = ?, updatedAt = ? WHERE userId = ? AND episodeId = ?").run(progress, now, req.user!.id, req.params.episodeId);
    syncWriteToTurso(
      "UPDATE watch_history SET progress = ?, updatedAt = ? WHERE userId = ? AND episodeId = ?",
      [progress, now, req.user!.id, req.params.episodeId]
    );
  } else {
    const histId = crypto.randomUUID();
    db.prepare("INSERT INTO watch_history (id, userId, episodeId, progress, updatedAt) VALUES (?, ?, ?, ?, ?)").run(histId, req.user!.id, req.params.episodeId, progress, now);
    syncWriteToTurso(
      "INSERT OR REPLACE INTO watch_history (id, userId, episodeId, progress, updatedAt) VALUES (?, ?, ?, ?, ?)",
      [histId, req.user!.id, req.params.episodeId, progress, now]
    );
  }
  res.status(200).json({ success: true, episodeId: req.params.episodeId });
}));

// CASHFREE PAYMENT GATEWAY API (EXCLUSIVE)
api.post("/payments/cashfree/order", auth, safe(async (req: AuthRequest, res) => {
  const appId = (process.env.CASHFREE_APP_ID || "").trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || "").trim();
  const environment = (process.env.CASHFREE_ENVIRONMENT || "SANDBOX").toUpperCase().trim();
  const isProd = ["PRODUCTION", "PROD", "LIVE"].includes(environment);

  if (!appId || !secretKey) {
    return res.status(503).json({ message: "Cashfree payment gateway is not configured yet. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY to your .env file." });
  }

  const userId = req.user!.id;
  let user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) {
    const userEmail = (req.user as any)?.email || `user_${String(userId).substring(0, 8)}@example.com`;
    const userName = req.user!.name || "User";
    db.prepare("INSERT OR IGNORE INTO users (id, name, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)").run(
      userId,
      userName,
      userEmail,
      "oauth_placeholder",
      "user",
      new Date().toISOString()
    );
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) || { id: userId, email: userEmail, name: userName };
  }

  const orderId = `cf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const planType = req.body?.plan;
  let orderAmount = 29;
  if (planType === "110_coins" || req.body?.amount === 49) orderAmount = 49;
  else if (planType === "220_coins" || req.body?.amount === 99) orderAmount = 99;
  else if (planType === "60_coins" || req.body?.amount === 29) orderAmount = 29;
  else if (typeof req.body?.amount === "number" && req.body.amount > 0) orderAmount = req.body.amount;

  // Compute dynamic public return URL to prevent localhost "This site can't be reached" errors
  const reqOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
  let frontendBase = process.env.FRONTEND_URL;
  if (!frontendBase || frontendBase.includes("localhost") || frontendBase.includes("127.0.0.1")) {
    frontendBase = reqOrigin || "https://sri-explainer-frontend.vercel.app";
  }
  frontendBase = frontendBase.replace(/\/+$/, "");
  const returnUrl = `${frontendBase}/profile?order_id={order_id}`;

  console.log("[Cashfree Order Creation]: Target Return URL ->", returnUrl, "Amount:", orderAmount, "IsProd:", isProd);

  const payload = {
    order_id: orderId,
    order_amount: orderAmount,
    order_currency: "INR",
    customer_details: {
      customer_id: String(userId).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40),
      customer_name: user?.name || "Customer",
      customer_email: user?.email || "customer@example.com",
      customer_phone: req.body?.customer_phone || user?.phone || "9876543210"
    },
    order_meta: {
      return_url: returnUrl
    }
  };

  let targetUrl = isProd
    ? "https://api.cashfree.com/pg/orders"
    : "https://sandbox.cashfree.com/pg/orders";
  let activeAppId = appId;
  let activeSecretKey = secretKey;
  let activeEnv = environment;

  let response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "2023-08-01",
      "x-client-id": activeAppId,
      "x-client-secret": activeSecretKey
    },
    body: JSON.stringify(payload)
  });

  let data: any = await response.json();

  // Smart Failover: If Live Production API key returns authentication Failed (due to pending KYC activation), fallback to Sandbox Test gateway seamlessly
  if (!response.ok && (data?.message?.toLowerCase().includes("authentication") || data?.code === "request_failed")) {
    console.warn("[Cashfree Smart Failover]: Production API returned authentication notice. Falling back to Sandbox Test mode...");
    targetUrl = "https://sandbox.cashfree.com/pg/orders";
    activeAppId = process.env.CASHFREE_TEST_APP_ID || "";
    activeSecretKey = process.env.CASHFREE_TEST_SECRET_KEY || "";
    activeEnv = "TEST";

    response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": activeAppId,
        "x-client-secret": activeSecretKey
      },
      body: JSON.stringify(payload)
    });
    data = await response.json();
  }

  if (!response.ok) {
    console.error("[Cashfree Order Error]:", data, "Target URL:", targetUrl, "Environment:", activeEnv);
    const msg = data?.message || data?.code || "Cashfree order creation failed";
    return res.status(400).json({ 
      message: `Cashfree Error (${data?.code || response.status}): ${msg}` 
    });
  }

  const payId = crypto.randomUUID();
  db.prepare("INSERT INTO payments (id, userId, razorpayOrderId, amount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)").run(payId, userId, orderId, orderAmount, "created", new Date().toISOString());

  res.json({
    order_id: data.order_id,
    payment_session_id: data.payment_session_id,
    environment: activeEnv,
    order_amount: orderAmount
  });
}));

api.post("/payments/cashfree/verify", optionalAuth, safe(async (req: AuthRequest, res) => {
  const { order_id } = z.object({ order_id: z.string() }).parse(req.body);

  // 1. Strict Idempotency Check: Ensure this order_id was not processed already
  const existingTx: any = db.prepare(
    "SELECT id, userId, amount, balanceAfter FROM xp_transactions WHERE referenceId = ? AND type = 'PURCHASE'"
  ).get(order_id);

  if (existingTx) {
    const u: any = db.prepare("SELECT xpCoins FROM users WHERE id = ?").get(existingTx.userId);
    return res.json({
      success: true,
      message: "Payment already verified.",
      xpCoins: Number(u?.xpCoins ?? existingTx.balanceAfter ?? 0),
      xpCoinsAdded: 0,
      alreadyVerified: true
    });
  }

  const appId = (process.env.CASHFREE_APP_ID || "").trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || "").trim();
  const environment = (process.env.CASHFREE_ENVIRONMENT || "SANDBOX").toUpperCase().trim();
  const isProd = ["PRODUCTION", "PROD", "LIVE"].includes(environment);

  let baseUrl = isProd
    ? `https://api.cashfree.com/pg/orders/${order_id}`
    : `https://sandbox.cashfree.com/pg/orders/${order_id}`;

  let activeAppId = appId;
  let activeSecretKey = secretKey;

  let response = await fetch(baseUrl, {
    headers: {
      "x-api-version": "2023-08-01",
      "x-client-id": activeAppId || "",
      "x-client-secret": activeSecretKey || ""
    }
  });

  // Smart Sandbox Failover: If Live Production API fails, fallback to Sandbox Test mode
  if (!response.ok) {
    baseUrl = `https://sandbox.cashfree.com/pg/orders/${order_id}`;
    activeAppId = process.env.CASHFREE_TEST_APP_ID || "";
    activeSecretKey = process.env.CASHFREE_TEST_SECRET_KEY || "";
    const sandboxRes = await fetch(baseUrl, {
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": activeAppId,
        "x-client-secret": activeSecretKey
      }
    });
    if (sandboxRes.ok) {
      response = sandboxRes;
    }
  }

  if (!response.ok) {
    return res.status(400).json({ message: "Failed to verify Cashfree payment status" });
  }

  const data: any = await response.json();
  const existingPayment: any = db.prepare("SELECT * FROM payments WHERE razorpayOrderId = ?").get(order_id);

  if (data?.order_status === "PAID") {
    const userId = req.user?.id || existingPayment?.userId || data?.customer_details?.customer_id;
    if (!userId) {
      return res.status(400).json({ message: "Unable to associate payment with user account" });
    }

    let u: any = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!u) {
      const uEmail = data?.customer_details?.customer_email || (req.user as any)?.email || `user_${String(userId).substring(0, 8)}@example.com`;
      const uName = data?.customer_details?.customer_name || req.user?.name || "User";
      db.prepare("INSERT OR IGNORE INTO users (id, name, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)").run(
        userId,
        uName,
        uEmail,
        "oauth_placeholder",
        "user",
        new Date().toISOString()
      );
      u = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    }

    db.prepare("UPDATE payments SET status = 'paid' WHERE razorpayOrderId = ?").run(order_id);

    const orderAmount = Math.round(Number(data?.order_amount || existingPayment?.amount || 29));
    let coinsToAdd = 60;
    if (orderAmount === 49) coinsToAdd = 110;
    else if (orderAmount === 99) coinsToAdd = 220;
    else if (orderAmount === 29) coinsToAdd = 60;
    else coinsToAdd = Math.round(orderAmount * 2.2);

    const balanceBefore = Number(u?.xpCoins || 0);

    // Atomic Balance Credit
    db.prepare("UPDATE users SET xpCoins = COALESCE(CAST(xpCoins AS INTEGER), 0) + ? WHERE id = ?").run(coinsToAdd, userId);
    syncWriteToTurso("UPDATE users SET xpCoins = COALESCE(CAST(xpCoins AS INTEGER), 0) + ? WHERE id = ?", [coinsToAdd, userId]);

    const updatedUser: any = db.prepare("SELECT xpCoins FROM users WHERE id = ?").get(userId);
    const balanceAfter = Number(updatedUser?.xpCoins ?? (balanceBefore + coinsToAdd));

    const txId = `tx_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // Insert Transaction Ledger
    db.prepare(
      "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'PURCHASE', ?, ?, ?, ?, ?, ?)"
    ).run(txId, userId, coinsToAdd, balanceBefore, balanceAfter, `Purchased ${coinsToAdd} XP Coins (₹${orderAmount})`, order_id, now);

    syncWriteToTurso(
      "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'PURCHASE', ?, ?, ?, ?, ?, ?)",
      [txId, userId, coinsToAdd, balanceBefore, balanceAfter, `Purchased ${coinsToAdd} XP Coins (₹${orderAmount})`, order_id, now]
    );

    notifyTelegramPayment(u?.email || userId, `XP Coins (${coinsToAdd} Coins)`, `₹${orderAmount}`, order_id);

    return res.json({
      success: true,
      message: `✓ ${coinsToAdd} XP Coins added successfully!`,
      xpCoins: balanceAfter,
      xpCoinsAdded: coinsToAdd
    });
  }

  return res.status(400).json({ message: "Payment failed or incomplete. No XP Coins were credited." });
}));

// ADMIN & WEBHOOK REFUND REVERSAL ENDPOINTS
api.post("/admin/xp-coins/refund", auth, admin, safe(async (req: AuthRequest, res) => {
  const { order_id, reason } = z.object({
    order_id: z.string().min(1),
    reason: z.string().optional()
  }).parse(req.body);

  // 1. Check if a REFUND transaction already exists (Strict Idempotency)
  const existingRefund: any = db.prepare(
    "SELECT id FROM xp_transactions WHERE referenceId = ? AND type = 'REFUND'"
  ).get(order_id);

  if (existingRefund) {
    return res.json({
      success: true,
      message: "Payment purchase has already been refunded.",
      alreadyRefunded: true
    });
  }

  // 2. Find original PURCHASE transaction
  const purchaseTx: any = db.prepare(
    "SELECT * FROM xp_transactions WHERE referenceId = ? AND type = 'PURCHASE'"
  ).get(order_id);

  if (!purchaseTx) {
    return res.status(404).json({ message: `No verified XP Coin purchase found matching Order ID: ${order_id}` });
  }

  const targetUserId = purchaseTx.userId;
  const coinsGranted = Math.abs(Number(purchaseTx.amount || 0));

  if (coinsGranted <= 0) {
    return res.status(400).json({ message: "Invalid original purchase coin amount" });
  }

  const u: any = db.prepare("SELECT id, name, email, xpCoins FROM users WHERE id = ?").get(targetUserId);
  if (!u) {
    return res.status(404).json({ message: "Associated user account not found" });
  }

  const balanceBefore = Number(u.xpCoins || 0);
  const balanceAfter = Math.max(0, balanceBefore - coinsGranted);

  // 3. Atomic Balance Reversal (SQLite + Turso Cloud sync)
  db.prepare("UPDATE users SET xpCoins = ? WHERE id = ?").run(balanceAfter, targetUserId);
  syncWriteToTurso("UPDATE users SET xpCoins = ? WHERE id = ?", [balanceAfter, targetUserId]);

  // 4. Update payments status to refunded
  db.prepare("UPDATE payments SET status = 'refunded' WHERE razorpayOrderId = ? OR id = ?").run(order_id, order_id);
  syncWriteToTurso("UPDATE payments SET status = 'refunded' WHERE razorpayOrderId = ? OR id = ?", [order_id, order_id]);

  const txId = `tx_refund_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // 5. Record Immutable Refund Transaction Ledger
  const desc = `Reversed ${coinsGranted} XP Coins for refunded order: ${order_id}${reason ? ` (${reason})` : ''}`;
  db.prepare(
    "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'REFUND', ?, ?, ?, ?, ?, ?)"
  ).run(txId, targetUserId, -coinsGranted, balanceBefore, balanceAfter, desc, order_id, now);

  syncWriteToTurso(
    "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'REFUND', ?, ?, ?, ?, ?, ?)",
    [txId, targetUserId, -coinsGranted, balanceBefore, balanceAfter, desc, order_id, now]
  );

  return res.json({
    success: true,
    message: `✓ Reversed ${coinsGranted} XP Coins for user ${u.email || targetUserId}.`,
    refundedCoins: coinsGranted,
    previousBalance: balanceBefore,
    newBalance: balanceAfter,
    userEmail: u.email
  });
}));

api.post("/payments/cashfree/refund", auth, admin, safe(async (req: AuthRequest, res) => {
  const { order_id } = z.object({ order_id: z.string().min(1) }).parse(req.body);
  const existingRefund: any = db.prepare("SELECT id FROM xp_transactions WHERE referenceId = ? AND type = 'REFUND'").get(order_id);
  if (existingRefund) {
    return res.json({ success: true, message: "Payment already refunded.", alreadyRefunded: true });
  }

  const purchaseTx: any = db.prepare("SELECT * FROM xp_transactions WHERE referenceId = ? AND type = 'PURCHASE'").get(order_id);
  if (!purchaseTx) return res.status(404).json({ message: "Original purchase transaction not found" });

  const targetUserId = purchaseTx.userId;
  const coinsGranted = Math.abs(Number(purchaseTx.amount || 0));
  const u: any = db.prepare("SELECT id, name, email, xpCoins FROM users WHERE id = ?").get(targetUserId);
  if (!u) return res.status(404).json({ message: "User not found" });

  const balanceBefore = Number(u.xpCoins || 0);
  const balanceAfter = Math.max(0, balanceBefore - coinsGranted);

  db.prepare("UPDATE users SET xpCoins = ? WHERE id = ?").run(balanceAfter, targetUserId);
  syncWriteToTurso("UPDATE users SET xpCoins = ? WHERE id = ?", [balanceAfter, targetUserId]);
  db.prepare("UPDATE payments SET status = 'refunded' WHERE razorpayOrderId = ? OR id = ?").run(order_id, order_id);

  const txId = `tx_refund_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'REFUND', ?, ?, ?, ?, ?, ?)").run(txId, targetUserId, -coinsGranted, balanceBefore, balanceAfter, `Reversed ${coinsGranted} XP Coins for order ${order_id}`, order_id, now);
  syncWriteToTurso("INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'REFUND', ?, ?, ?, ?, ?, ?)", [txId, targetUserId, -coinsGranted, balanceBefore, balanceAfter, `Reversed ${coinsGranted} XP Coins for order ${order_id}`, order_id, now]);

  res.json({ success: true, message: `✓ Reversed ${coinsGranted} XP Coins!`, newBalance: balanceAfter });
}));

api.post("/cashfree/webhook", safe(async (req, res) => {
  const eventType = req.body?.type || req.body?.event_type;
  const data = req.body?.data;
  if (eventType === "REFUND_STATUS_WEBHOOK" || eventType === "REFUND_SUCCESS" || data?.refund?.refund_status === "SUCCESS") {
    const orderId = data?.order?.order_id || data?.refund?.order_id;
    if (orderId) {
      const existingRefund: any = db.prepare("SELECT id FROM xp_transactions WHERE referenceId = ? AND type = 'REFUND'").get(orderId);
      if (!existingRefund) {
        const purchaseTx: any = db.prepare("SELECT * FROM xp_transactions WHERE referenceId = ? AND type = 'PURCHASE'").get(orderId);
        if (purchaseTx) {
          const targetUserId = purchaseTx.userId;
          const coinsGranted = Math.abs(Number(purchaseTx.amount || 0));
          const u: any = db.prepare("SELECT id, xpCoins FROM users WHERE id = ?").get(targetUserId);
          if (u && coinsGranted > 0) {
            const balanceBefore = Number(u.xpCoins || 0);
            const balanceAfter = Math.max(0, balanceBefore - coinsGranted);
            db.prepare("UPDATE users SET xpCoins = ? WHERE id = ?").run(balanceAfter, targetUserId);
            syncWriteToTurso("UPDATE users SET xpCoins = ? WHERE id = ?", [balanceAfter, targetUserId]);
            db.prepare("UPDATE payments SET status = 'refunded' WHERE razorpayOrderId = ? OR id = ?").run(orderId, orderId);
            const txId = `tx_refund_${crypto.randomUUID()}`;
            const now = new Date().toISOString();
            db.prepare("INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'REFUND', ?, ?, ?, ?, ?, ?)").run(txId, targetUserId, -coinsGranted, balanceBefore, balanceAfter, `Reversed ${coinsGranted} XP Coins via Cashfree Refund Webhook for order: ${orderId}`, orderId, now);
            syncWriteToTurso("INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'REFUND', ?, ?, ?, ?, ?, ?)", [txId, targetUserId, -coinsGranted, balanceBefore, balanceAfter, `Reversed ${coinsGranted} XP Coins via Cashfree Refund Webhook for order: ${orderId}`, orderId, now]);
          }
        }
      }
    }
  }
  res.json({ success: true, message: "Webhook processed" });
}));

// ADMIN PREMIUM SUBSCRIPTIONS MANAGEMENT ENDPOINTS
api.get("/admin/subscriptions", auth, admin, safe(async (req, res) => {
  const { search, status, sortBy } = req.query as { search?: string; status?: string; sortBy?: string };

  let query = `
    SELECT 
      s.id as subscriptionId,
      s.userId,
      u.name as userName,
      u.email as userEmail,
      s.paymentId,
      p.razorpayOrderId as orderId,
      p.amount,
      s.startsAt as purchaseDate,
      s.endsAt as expiryDate,
      s.status as subStatus
    FROM subscriptions s
    LEFT JOIN users u ON s.userId = u.id
    LEFT JOIN payments p ON s.paymentId = p.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (search && search.trim()) {
    query += ` AND (u.email LIKE ? OR u.id LIKE ? OR u.name LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  const rows: any[] = db.prepare(query).all(...params);
  const nowMs = Date.now();

  let list = rows.map((r) => {
    const expMs = r.expiryDate ? new Date(r.expiryDate).getTime() : 0;
    let computedStatus = r.subStatus || "active";

    if (computedStatus !== "cancelled") {
      computedStatus = expMs > nowMs ? "active" : "expired";
    }

    const remainingDays = expMs > nowMs ? Math.max(1, Math.ceil((expMs - nowMs) / 864e5)) : 0;
    const planName = r.paymentId === "ADMIN_GRANTED" ? "Admin Granted Premium" : (r.amount === 89 ? "3 Months Premium" : "30 Days Premium");
    const source = r.paymentId === "ADMIN_GRANTED" ? "Admin Granted" : "Paid Subscription";

    return {
      subscriptionId: r.subscriptionId,
      userId: r.userId,
      userName: r.userName || "User",
      userEmail: r.userEmail || "N/A",
      paymentId: r.paymentId || r.orderId || "N/A",
      orderId: r.orderId || "N/A",
      amount: r.amount || 0,
      source,
      planName,
      purchaseDate: r.purchaseDate,
      expiryDate: r.expiryDate,
      remainingDays,
      status: computedStatus
    };
  });

  if (status && status !== "all") {
    list = list.filter((item) => item.status === status.toLowerCase());
  }

  if (sortBy === "expiry_asc") {
    list.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  } else {
    list.sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime());
  }

  const allSubs: any[] = db.prepare(`
    SELECT s.status as subStatus, s.endsAt as expiryDate 
    FROM subscriptions s
  `).all();

  let activeCount = 0;
  let expiredCount = 0;
  let cancelledCount = 0;

  allSubs.forEach((s) => {
    const expMs = s.expiryDate ? new Date(s.expiryDate).getTime() : 0;
    if (s.subStatus === "cancelled") {
      cancelledCount++;
    } else if (expMs > nowMs) {
      activeCount++;
    } else {
      expiredCount++;
    }
  });

  res.json({
    subscriptions: list,
    stats: {
      totalUsers: allSubs.length,
      activeUsers: activeCount,
      expiredUsers: expiredCount,
      cancelledUsers: cancelledCount
    }
  });
}));

api.post("/admin/subscriptions/grant-access", auth, admin, safe(async (req, res) => {
  const { email, days, months } = z.object({
    email: z.string().email(),
    days: z.number().optional(),
    months: z.number().optional()
  }).parse(req.body);

  const cleanEmail = email.trim().toLowerCase();
  const u: any = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(cleanEmail);

  if (!u) {
    return res.status(404).json({ message: "User not found. Ask the user to create an account first." });
  }

  const now = new Date();
  const daysToAdd = days ? days : ((months || 1) * 30);
  const nowMs = now.getTime();

  // Start Premium period from current moment
  const newEndsAt = new Date(nowMs + daysToAdd * 864e5).toISOString();

  db.prepare("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?").run(newEndsAt, u.id);
  syncWriteToTurso("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?", [newEndsAt, u.id]);

  const subId = `admin_sub_${crypto.randomUUID()}`;
  const planLabel = `Admin Granted (${daysToAdd} Days)`;

  db.prepare(`
    INSERT INTO subscriptions (id, userId, plan, paymentId, amount, startsAt, endsAt, status, createdAt)
    VALUES (?, ?, ?, 'ADMIN_GRANTED', 0, ?, ?, 'active', ?)
  `).run(subId, u.id, planLabel, now.toISOString(), newEndsAt, now.toISOString());

  syncWriteToTurso(`
    INSERT OR REPLACE INTO subscriptions (id, userId, plan, paymentId, amount, startsAt, endsAt, status, createdAt)
    VALUES (?, ?, ?, 'ADMIN_GRANTED', 0, ?, ?, 'active', ?)
  `, [subId, u.id, planLabel, now.toISOString(), newEndsAt, now.toISOString()]);

  res.json({
    success: true,
    message: `Premium access (${daysToAdd} Days) granted successfully to ${u.email}`,
    user: {
      id: u.id,
      email: u.email,
      subscriptionEndsAt: newEndsAt
    }
  });
}));

api.post("/admin/subscriptions/revoke-grant", auth, admin, safe(async (req, res) => {
  const { email, subscriptionId } = z.object({
    email: z.string().optional(),
    subscriptionId: z.string().optional()
  }).parse(req.body);

  let u: any = null;
  if (email) {
    u = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(email.trim());
  } else if (subscriptionId) {
    const sub: any = db.prepare("SELECT userId FROM subscriptions WHERE id = ?").get(subscriptionId);
    if (sub) u = db.prepare("SELECT * FROM users WHERE id = ?").get(sub.userId);
  }

  if (!u) {
    return res.status(404).json({ message: "User not found." });
  }

  const nowIso = new Date().toISOString();

  db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE userId = ? AND paymentId = 'ADMIN_GRANTED'").run(u.id);
  syncWriteToTurso("UPDATE subscriptions SET status = 'cancelled' WHERE userId = ? AND paymentId = 'ADMIN_GRANTED'", [u.id]);

  const activePaidSub: any = db.prepare("SELECT * FROM subscriptions WHERE userId = ? AND status = 'active' AND paymentId != 'ADMIN_GRANTED' AND endsAt > ?").get(u.id, nowIso);

  if (activePaidSub) {
    db.prepare("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?").run(activePaidSub.endsAt, u.id);
    syncWriteToTurso("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?", [activePaidSub.endsAt, u.id]);
  } else {
    db.prepare("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?").run(nowIso, u.id);
    syncWriteToTurso("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?", [nowIso, u.id]);
  }

  res.json({ success: true, message: `Admin-granted Premium revoked for ${u.email}` });
}));

api.post("/admin/subscriptions/cancel", auth, admin, safe(async (req, res) => {
  const { subscriptionId, userId } = z.object({
    subscriptionId: z.string(),
    userId: z.string()
  }).parse(req.body);

  const nowIso = new Date().toISOString();
  db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?").run(subscriptionId);
  syncWriteToTurso("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?", [subscriptionId]);

  db.prepare("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?").run(nowIso, userId);
  syncWriteToTurso("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?", [nowIso, userId]);

  res.json({ message: "Subscription cancelled successfully", success: true });
}));

api.post("/admin/subscriptions/refund", auth, admin, safe(async (req, res) => {
  const { subscriptionId, userId, paymentId, notes } = z.object({
    subscriptionId: z.string(),
    userId: z.string(),
    paymentId: z.string().optional(),
    notes: z.string().optional()
  }).parse(req.body);

  const nowIso = new Date().toISOString();

  db.prepare("UPDATE subscriptions SET status = 'refunded' WHERE id = ?").run(subscriptionId);
  syncWriteToTurso("UPDATE subscriptions SET status = 'refunded' WHERE id = ?", [subscriptionId]);

  db.prepare("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?").run(nowIso, userId);
  syncWriteToTurso("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?", [nowIso, userId]);

  if (paymentId) {
    db.prepare("UPDATE payments SET status = 'refunded' WHERE id = ? OR razorpayOrderId = ?").run(paymentId, paymentId);
  }

  const refundId = crypto.randomUUID();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS refund_history (
        id TEXT PRIMARY KEY,
        subscriptionId TEXT NOT NULL,
        userId TEXT NOT NULL,
        paymentId TEXT,
        notes TEXT,
        refundedAt TEXT NOT NULL
      );
    `);
    db.prepare("INSERT INTO refund_history (id, subscriptionId, userId, paymentId, notes, refundedAt) VALUES (?, ?, ?, ?, ?, ?)").run(refundId, subscriptionId, userId, paymentId || "", notes || "Admin Full Refund", nowIso);
    syncWriteToTurso("INSERT OR REPLACE INTO refund_history (id, subscriptionId, userId, paymentId, notes, refundedAt) VALUES (?, ?, ?, ?, ?, ?)", [refundId, subscriptionId, userId, paymentId || "", notes || "Admin Full Refund", nowIso]);
  } catch (err) {}

  res.json({ message: "Refund processed successfully. Premium membership revoked.", success: true, status: "refunded" });
}));

api.post("/admin/subscriptions/extend", auth, admin, safe(async (req, res) => {
  const { subscriptionId, userId, days } = z.object({
    subscriptionId: z.string(),
    userId: z.string(),
    days: z.number().positive().default(30)
  }).parse(req.body);

  const u: any = db.prepare("SELECT subscriptionEndsAt FROM users WHERE id = ?").get(userId);
  const currentExpiry = u?.subscriptionEndsAt && new Date(u.subscriptionEndsAt).getTime() > Date.now()
    ? new Date(u.subscriptionEndsAt).getTime()
    : Date.now();

  const newEndsAt = new Date(currentExpiry + days * 864e5).toISOString();

  db.prepare("UPDATE subscriptions SET endsAt = ?, status = 'active' WHERE id = ?").run(newEndsAt, subscriptionId);
  syncWriteToTurso("UPDATE subscriptions SET endsAt = ?, status = 'active' WHERE id = ?", [newEndsAt, subscriptionId]);

  db.prepare("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?").run(newEndsAt, userId);
  syncWriteToTurso("UPDATE users SET subscriptionEndsAt = ? WHERE id = ?", [newEndsAt, userId]);

  res.json({ message: `Subscription extended by ${days} days successfully!`, success: true, endsAt: newEndsAt });
}));

// ADMIN DASHBOARD ENDPOINTS
api.get("/admin/stats", auth, admin, safe(async (_q, r) => {
  const users = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  const series = (db.prepare("SELECT COUNT(*) as c FROM series").get() as any).c;
  const episodes = (db.prepare("SELECT COUNT(*) as c FROM episodes").get() as any).c;
  const payments = (db.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'paid'").get() as any).c;
  r.json({ users, series, episodes, payments });
}));

api.get("/admin/users", auth, admin, safe(async (_q, r) => {
  const rows = db.prepare("SELECT id as _id, name, email, role, subscriptionEndsAt, createdAt FROM users ORDER BY createdAt DESC").all();
  r.json(rows);
}));

// ADMIN XP COINS ENDPOINTS
api.get("/admin/xp-coins", auth, admin, safe(async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  let sql = "SELECT id, name, email, role, xpCoins, createdAt FROM users";
  const args: any[] = [];

  if (q) {
    sql += " WHERE email LIKE ? OR name LIKE ? OR id LIKE ?";
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += " ORDER BY createdAt DESC LIMIT 50";

  const users = db.prepare(sql).all(...args);
  res.json({ users });
}));

const handleAdminXpCoinsPost = safe(async (req: AuthRequest, res: express.Response) => {
  const { userId, action, amount, note } = req.body || {};

  const MAX_SAFE_XP_GRANT = 1000000;
  const numAmount = Number(amount);
  if (
    typeof amount !== "number" ||
    isNaN(numAmount) ||
    !isFinite(numAmount) ||
    !Number.isInteger(numAmount) ||
    numAmount <= 0 ||
    numAmount > MAX_SAFE_XP_GRANT ||
    !Number.isSafeInteger(numAmount)
  ) {
    return res.status(400).json({ message: "Invalid XP Coin amount." });
  }

  if (!userId || !action) {
    return res.status(400).json({ message: "Invalid payload parameters" });
  }

  const targetIdStr = String(userId).trim();
  const user: any = db.prepare("SELECT id, name, email, xpCoins FROM users WHERE id = ? OR email = ?").get(targetIdStr, targetIdStr);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const targetUserId = String(user.id);
  const balanceBefore = Number(user.xpCoins || 0);
  let type = "ADMIN_GRANT";
  let delta = 0;

  if (action === "add" || action === "grant") {
    delta = numAmount;
    db.prepare("UPDATE users SET xpCoins = COALESCE(CAST(xpCoins AS INTEGER), 0) + ? WHERE id = ?").run(delta, targetUserId);
    syncWriteToTurso("UPDATE users SET xpCoins = COALESCE(CAST(xpCoins AS INTEGER), 0) + ? WHERE id = ?", [delta, targetUserId]);
    type = "ADMIN_GRANT";
  } else if (action === "remove" || action === "deduct") {
    delta = -numAmount;
    db.prepare("UPDATE users SET xpCoins = MAX(0, COALESCE(CAST(xpCoins AS INTEGER), 0) - ?) WHERE id = ?").run(numAmount, targetUserId);
    syncWriteToTurso("UPDATE users SET xpCoins = MAX(0, COALESCE(CAST(xpCoins AS INTEGER), 0) - ?) WHERE id = ?", [numAmount, targetUserId]);
    type = "ADMIN_ADJUSTMENT";
  } else {
    return res.status(400).json({ message: "Invalid action" });
  }

  const updatedUser: any = db.prepare("SELECT id, name, email, xpCoins FROM users WHERE id = ?").get(targetUserId);
  const balanceAfter = Number(updatedUser?.xpCoins ?? (balanceBefore + delta));

  const txId = `tx_admin_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const adminRef = req.user?.id || "sys";
  const desc = note ? `Admin Action (${action}): ${note}` : `Admin ${type === "ADMIN_GRANT" ? "Grant" : "Adjustment"} (${delta >= 0 ? "+" : ""}${delta} XP Coins)`;

  db.prepare(
    "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(txId, targetUserId, type, delta, balanceBefore, balanceAfter, desc, adminRef, now);

  syncWriteToTurso(
    "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [txId, targetUserId, type, delta, balanceBefore, balanceAfter, desc, adminRef, now]
  );

  res.json({
    success: true,
    message: type === "ADMIN_GRANT" ? `${numAmount} XP Coins added successfully.` : `${numAmount} XP Coins deducted successfully.`,
    user: {
      id: targetUserId,
      email: user.email,
      xpCoins: balanceAfter
    }
  });
});

api.post("/admin/xp-coins", auth, admin, handleAdminXpCoinsPost);
api.post("/admin/xp-coins/grant", auth, admin, handleAdminXpCoinsPost);

// CO-ADMIN MANAGEMENT ENDPOINTS (MAIN ADMIN ONLY)
api.get("/admin/co-admins", auth, mainAdmin, safe(async (_req, res) => {
  const rows = db.prepare("SELECT id, name, email, role, avatar, createdAt FROM users WHERE role = 'co_admin' ORDER BY createdAt DESC").all();
  res.json(rows);
}));

api.post("/admin/co-admins", auth, mainAdmin, safe(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const cleanEmail = email.toLowerCase().trim();

  if (ADMIN_EMAILS.includes(cleanEmail)) {
    return res.status(400).json({ message: "This email belongs to one of the two Main Admins." });
  }

  const targetUser: any = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);
  if (!targetUser) {
    return res.status(404).json({ message: `No registered user account found with email "${cleanEmail}". User must register an account first.` });
  }

  if (targetUser.role === "co_admin") {
    return res.status(400).json({ message: `User "${targetUser.name || cleanEmail}" is already a Co-Admin.` });
  }

  db.prepare("UPDATE users SET role = 'co_admin' WHERE id = ?").run(targetUser.id);
  syncWriteToTurso("UPDATE users SET role = 'co_admin' WHERE id = ?", [targetUser.id]);
  triggerRealtimeBackup();

  res.json({
    success: true,
    message: `User ${targetUser.name || cleanEmail} (${cleanEmail}) is now assigned as Co-Admin!`,
    user: { id: targetUser.id, name: targetUser.name, email: targetUser.email, role: "co_admin" }
  });
}));

api.delete("/admin/co-admins/:id", auth, mainAdmin, safe(async (req, res) => {
  const targetUser: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ message: "Co-Admin user account not found." });
  }

  const cleanEmail = (targetUser.email || "").toLowerCase().trim();
  if (ADMIN_EMAILS.includes(cleanEmail)) {
    return res.status(400).json({ message: "Cannot revoke Main Admin permissions." });
  }

  db.prepare("UPDATE users SET role = 'user' WHERE id = ?").run(targetUser.id);
  syncWriteToTurso("UPDATE users SET role = 'user' WHERE id = ?", [targetUser.id]);
  triggerRealtimeBackup();

  res.json({
    success: true,
    message: `Co-Admin access revoked for ${targetUser.email}. Account returned to normal user.`
  });
}));

api.get("/admin/episodes", auth, admin, safe(async (req, res) => {
  let query = "SELECT e.*, s.title as seriesTitle FROM episodes e JOIN series s ON e.seriesId = s.id";
  const params: any[] = [];
  if (req.query.seriesId) {
    query += " WHERE e.seriesId = ?";
    params.push(req.query.seriesId);
  }
  query += " ORDER BY e.createdAt DESC";
  const rows = db.prepare(query).all(...params);
  res.json(rows.map((e: any) => ({ ...formatEpisode(e), seriesTitle: e.seriesTitle })));
}));


api.post("/admin/upload", auth, admin, upload.single("image"), safe(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "A media file (image or video) is required" });
  
  const filename = req.file.filename;
  const mimeType = req.file.mimetype || "image/png";
  const now = new Date().toISOString();

  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Data = fileBuffer.toString("base64");

    db.prepare("INSERT OR REPLACE INTO media_storage (id, filename, mimeType, data, createdAt) VALUES (?, ?, ?, ?, ?)").run(
      filename,
      filename,
      mimeType,
      base64Data,
      now
    );

    syncWriteToTurso(
      "INSERT OR REPLACE INTO media_storage (id, filename, mimeType, data, createdAt) VALUES (?, ?, ?, ?, ?)",
      [filename, filename, mimeType, base64Data, now]
    );
    console.log(`[Media Upload]: Saved and synced media file ${filename} to Turso Cloud Storage.`);
  } catch (err: any) {
    console.error("[Media Storage Error]:", err.message);
  }

  const finalUrl = `/uploads/${filename}`;
  res.status(201).json({ url: finalUrl });
}));

// Telegram Permanent Cloud Storage Stream Proxy Route
api.get("/media/:fileId", (req, res) => {
  streamTelegramMedia(req.params.fileId, req, res);
});

// FEATURED HERO SLIDESHOW API ROUTES
api.get("/slides", safe(async (_req, res) => {
  try {
    const slides = db.prepare("SELECT * FROM featured_slides WHERE isActive = 1 ORDER BY displayOrder ASC, createdAt DESC LIMIT 4").all();
    res.json(slides);
  } catch {
    res.json([]);
  }
}));

api.get("/admin/slides", auth, admin, safe(async (_req, res) => {
  try {
    const slides = db.prepare("SELECT * FROM featured_slides ORDER BY displayOrder ASC, createdAt DESC").all();
    res.json(slides);
  } catch {
    res.json([]);
  }
}));

api.post("/admin/slides", auth, admin, safe(async (req, res) => {
  const data = z.object({
    id: z.string().optional(),
    seriesId: z.string().optional().default(""),
    title: z.string().min(1),
    subtitle: z.string().optional().default(""),
    description: z.string().optional().default(""),
    heroImage: z.string().optional().default(""),
    badge: z.string().optional().default("FEATURED"),
    quality: z.string().optional().default("4K ULTRA HD"),
    year: z.number().optional().default(2026),
    displayOrder: z.number().optional().default(1),
    isActive: z.number().optional().default(1)
  }).parse(req.body);

  const now = new Date().toISOString();

  if (data.id) {
    db.prepare(`
      UPDATE featured_slides SET
        seriesId = ?, title = ?, subtitle = ?, description = ?, heroImage = ?,
        badge = ?, quality = ?, year = ?, displayOrder = ?, isActive = ?
      WHERE id = ?
    `).run(
      data.seriesId, data.title, data.subtitle, data.description, data.heroImage,
      data.badge, data.quality, data.year, data.displayOrder, data.isActive, data.id
    );
    syncWriteToTurso(`
      UPDATE featured_slides SET
        seriesId = ?, title = ?, subtitle = ?, description = ?, heroImage = ?,
        badge = ?, quality = ?, year = ?, displayOrder = ?, isActive = ?
      WHERE id = ?
    `, [data.seriesId, data.title, data.subtitle, data.description, data.heroImage, data.badge, data.quality, data.year, data.displayOrder, data.isActive, data.id]);
  } else {
    const count = (db.prepare("SELECT COUNT(*) as c FROM featured_slides").get() as any)?.c || 0;
    if (count >= 4) {
      return res.status(400).json({ message: "Maximum limit of 4 featured slides reached. Please edit or delete existing slides." });
    }
    const slideId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO featured_slides (id, seriesId, title, subtitle, description, heroImage, badge, quality, year, displayOrder, isActive, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(slideId, data.seriesId, data.title, data.subtitle, data.description, data.heroImage, data.badge, data.quality, data.year, data.displayOrder, data.isActive, now);
    syncWriteToTurso(`
      INSERT OR REPLACE INTO featured_slides (id, seriesId, title, subtitle, description, heroImage, badge, quality, year, displayOrder, isActive, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [slideId, data.seriesId, data.title, data.subtitle, data.description, data.heroImage, data.badge, data.quality, data.year, data.displayOrder, data.isActive, now]);
  }

  res.json({ success: true, message: "Featured slide saved successfully." });
}));

api.delete("/admin/slides/:id", auth, admin, safe(async (req, res) => {
  db.prepare("DELETE FROM featured_slides WHERE id = ?").run(req.params.id);
  syncWriteToTurso("DELETE FROM featured_slides WHERE id = ?", [req.params.id]);
  res.json({ success: true, message: "Featured slide deleted successfully." });
}));

api.post("/admin/slides/reorder", auth, admin, safe(async (req, res) => {
  const { slideIds } = z.object({ slideIds: z.array(z.string()) }).parse(req.body);
  slideIds.forEach((id, index) => {
    db.prepare("UPDATE featured_slides SET displayOrder = ? WHERE id = ?").run(index + 1, id);
    syncWriteToTurso("UPDATE featured_slides SET displayOrder = ? WHERE id = ?", [index + 1, id]);
  });
  res.json({ success: true, message: "Slides reordered successfully." });
}));

api.post("/admin/series", auth, admin, safe(async (req, res) => {
  const d = z.object({
    title: z.string().min(2),
    description: z.string().min(10),
    logo: z.string().optional(),
    genres: z.array(z.string()).default([]),
    status: z.enum(["ongoing", "completed", "upcoming"]).default("ongoing"),
    year: z.number().optional(),
    studio: z.string().optional(),
    country: z.string().optional(),
    language: z.string().optional().default("English"),
    rating: z.string().optional().default("PG-13"),
    visibility: z.enum(["public", "private", "subscription"]).optional().default("public"),
    isUpcoming: z.boolean().optional().default(false),
    releaseDate: z.string().optional(),
    isMovie: z.boolean().optional().default(false),
    thumbnail: z.string().optional(),
    banner: z.string().optional(),
    featured: z.boolean().optional(),
    trending: z.boolean().optional(),
    videoUrl: z.string().optional()
  }).parse(req.body);

  const seriesId = crypto.randomUUID();
  let seriesSlug = slug(d.title);
  const existingSlug = db.prepare("SELECT id FROM series WHERE slug = ?").get(seriesSlug);
  if (existingSlug) {
    seriesSlug = `${seriesSlug}-${crypto.randomUUID().slice(0, 6)}`;
  }
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO series (id, title, slug, description, logo, genres, status, year, studio, country, language, rating, visibility, isUpcoming, releaseDate, isMovie, thumbnail, banner, featured, trending, videoUrl, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    seriesId,
    d.title,
    seriesSlug,
    d.description,
    d.logo || "",
    JSON.stringify(d.genres),
    d.status,
    d.year || new Date().getFullYear(),
    d.studio || "",
    d.country || "",
    d.language,
    d.rating,
    d.visibility,
    d.isUpcoming ? 1 : 0,
    d.releaseDate || null,
    d.isMovie ? 1 : 0,
    d.thumbnail || "",
    d.banner || "",
    d.featured ? 1 : 0,
    d.trending ? 1 : 0,
    d.videoUrl || "",
    now
  );

  const created = db.prepare("SELECT * FROM series WHERE id = ?").get(seriesId);
  syncWriteToTurso(
    `INSERT OR REPLACE INTO series (id, title, originalTitle, slug, type, description, genre, year, status, country, thumbnail, banner, featured, trending, views, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [seriesId, d.title, "", seriesSlug, "Series", d.description, JSON.stringify(d.genres), String(d.year || 2024), d.status, d.country || "", d.thumbnail || "", d.banner || "", d.featured ? 1 : 0, d.trending ? 1 : 0, 0, now]
  );
  res.status(201).json(formatSeries(created));
}));

api.patch("/admin/series/:id", auth, admin, safe(async (req, res) => {
  const { title, description, logo, genres, status, year, featured, trending, thumbnail, banner, language, rating, visibility, isUpcoming, releaseDate, isMovie, videoUrl, posterBadges } = req.body;
  const existing: any = db.prepare("SELECT * FROM series WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ message: "Series not found" });

  const posterBadgesVal = posterBadges !== undefined 
    ? (typeof posterBadges === "string" ? posterBadges : JSON.stringify(posterBadges))
    : null;

  db.prepare(`
    UPDATE series SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      logo = COALESCE(?, logo),
      genres = COALESCE(?, genres),
      status = COALESCE(?, status),
      year = COALESCE(?, year),
      featured = COALESCE(?, featured),
      trending = COALESCE(?, trending),
      thumbnail = COALESCE(?, thumbnail),
      banner = COALESCE(?, banner),
      language = COALESCE(?, language),
      rating = COALESCE(?, rating),
      visibility = COALESCE(?, visibility),
      isUpcoming = COALESCE(?, isUpcoming),
      releaseDate = COALESCE(?, releaseDate),
      isMovie = COALESCE(?, isMovie),
      videoUrl = COALESCE(?, videoUrl),
      posterBadges = COALESCE(?, posterBadges)
    WHERE id = ?
  `).run(
    title,
    description,
    logo,
    genres ? JSON.stringify(genres) : null,
    status,
    year,
    featured !== undefined ? (featured ? 1 : 0) : null,
    trending !== undefined ? (trending ? 1 : 0) : null,
    thumbnail,
    banner,
    language,
    rating,
    visibility,
    isUpcoming !== undefined ? (isUpcoming ? 1 : 0) : null,
    releaseDate,
    isMovie !== undefined ? (isMovie ? 1 : 0) : null,
    videoUrl,
    posterBadgesVal,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM series WHERE id = ?").get(req.params.id);
  triggerRealtimeBackup(500);
  res.json(formatSeries(updated));
}));

api.post("/admin/series/:id/duplicate", auth, admin, safe(async (req, res) => {
  const sId = req.params.id;
  const s: any = db.prepare("SELECT * FROM series WHERE id = ?").get(sId);
  if (!s) return res.status(404).json({ message: "Series not found" });

  const newId = crypto.randomUUID();
  const newTitle = `${s.title} (Copy)`;
  const newSlug = slug(`${s.title}-copy-${Date.now().toString(36)}`);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO series (id, title, slug, description, logo, genres, status, year, studio, country, language, rating, visibility, isUpcoming, releaseDate, isMovie, thumbnail, banner, featured, trending, videoUrl, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId,
    newTitle,
    newSlug,
    s.description,
    s.logo || "",
    s.genres,
    s.status,
    s.year,
    s.studio,
    s.country,
    s.language,
    s.rating,
    s.visibility,
    s.isUpcoming,
    s.releaseDate,
    s.isMovie,
    s.thumbnail,
    s.banner,
    s.featured,
    s.trending,
    s.videoUrl,
    now
  );

  const created = db.prepare("SELECT * FROM series WHERE id = ?").get(newId);
  triggerRealtimeBackup(500);
  res.status(201).json(formatSeries(created));
}));

api.delete("/admin/series/:id", auth, admin, safe(async (req, res) => {
  const seriesId = req.params.id;

  db.prepare("DELETE FROM episodes WHERE seriesId = ?").run(seriesId);
  db.prepare("DELETE FROM favorites WHERE seriesId = ?").run(seriesId);
  db.prepare("DELETE FROM reviews WHERE seriesId = ?").run(seriesId);
  db.prepare("DELETE FROM series WHERE id = ?").run(seriesId);

  // Synchronize deletion in real time to Turso Cloud Database so series NEVER reappears
  syncWriteToTurso("DELETE FROM episodes WHERE seriesId = ?", [seriesId]);
  syncWriteToTurso("DELETE FROM favorites WHERE seriesId = ?", [seriesId]);
  syncWriteToTurso("DELETE FROM reviews WHERE seriesId = ?", [seriesId]);
  syncWriteToTurso("DELETE FROM series WHERE id = ?", [seriesId]);

  console.log(`[Series Deletion]: Series ${seriesId} permanently deleted from local SQLite & Turso Cloud.`);
  res.status(204).end();
}));

api.post("/admin/episodes", auth, admin, safe(async (req, res) => {
  const d = z.object({
    series: z.string(),
    number: z.number().positive(),
    title: z.string().min(1),
    rumbleEmbedUrl: z.string().refine(isOfficialRumble, "Only official Rumble URLs are allowed"),
    duration: z.string().optional(),
    quality: z.string().optional().default("1080P"),
    releaseDate: z.string().optional(),
    thumbnail: z.string().optional(),
    visibility: z.enum(["public", "private", "subscription"]).optional().default("public"),
    isUpcoming: z.boolean().optional().default(false),
    commentsDisabled: z.boolean().optional().default(false),
    commentsLocked: z.boolean().optional().default(false)
  }).parse(req.body);

  const epId = crypto.randomUUID();
  const now = new Date().toISOString();
  const cleanUrl = normalizeRumbleUrl(d.rumbleEmbedUrl);

  db.prepare(`
    INSERT INTO episodes (id, seriesId, number, title, rumbleEmbedUrl, duration, quality, releaseDate, thumbnail, visibility, isUpcoming, commentsDisabled, commentsLocked, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    epId,
    d.series,
    d.number,
    d.title,
    cleanUrl,
    d.duration || "",
    d.quality || "1080P",
    d.releaseDate || now,
    d.thumbnail || "",
    d.visibility,
    d.isUpcoming ? 1 : 0,
    d.commentsDisabled ? 1 : 0,
    d.commentsLocked ? 1 : 0,
    now
  );

  const created = db.prepare("SELECT * FROM episodes WHERE id = ?").get(epId);
  syncWriteToTurso(
    `INSERT OR REPLACE INTO episodes (id, seriesId, number, title, rumbleEmbedUrl, duration, releaseDate, thumbnail, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [epId, d.series, d.number, d.title, cleanUrl, d.duration || "", d.releaseDate || now, d.thumbnail || "", now]
  );
  res.status(201).json(formatEpisode(created));
}));

api.patch("/admin/episodes/:id", auth, admin, safe(async (req, res) => {
  if (req.body.rumbleEmbedUrl && !isOfficialRumble(req.body.rumbleEmbedUrl)) {
    return res.status(400).json({ message: "Only official Rumble URLs are allowed" });
  }

  const { number, title, rumbleEmbedUrl, duration, quality, releaseDate, thumbnail, visibility, isUpcoming, commentsDisabled, commentsLocked } = req.body;
  const existing: any = db.prepare("SELECT * FROM episodes WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ message: "Episode not found" });

  const cleanUrl = rumbleEmbedUrl ? normalizeRumbleUrl(rumbleEmbedUrl) : null;

  db.prepare(`
    UPDATE episodes SET
      number = COALESCE(?, number),
      title = COALESCE(?, title),
      rumbleEmbedUrl = COALESCE(?, rumbleEmbedUrl),
      duration = COALESCE(?, duration),
      quality = COALESCE(?, quality),
      releaseDate = COALESCE(?, releaseDate),
      thumbnail = COALESCE(?, thumbnail),
      visibility = COALESCE(?, visibility),
      isUpcoming = COALESCE(?, isUpcoming),
      commentsDisabled = COALESCE(?, commentsDisabled),
      commentsLocked = COALESCE(?, commentsLocked)
    WHERE id = ?
  `).run(
    number,
    title,
    cleanUrl,
    duration,
    quality,
    releaseDate,
    thumbnail,
    visibility,
    isUpcoming !== undefined ? (isUpcoming ? 1 : 0) : null,
    commentsDisabled !== undefined ? (commentsDisabled ? 1 : 0) : null,
    commentsLocked !== undefined ? (commentsLocked ? 1 : 0) : null,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM episodes WHERE id = ?").get(req.params.id);
  triggerRealtimeBackup(500);
  res.json(formatEpisode(updated));
}));

api.delete("/admin/episodes/:id", auth, admin, safe(async (req, res) => {
  const epId = req.params.id;

  db.prepare("DELETE FROM watch_history WHERE episodeId = ?").run(epId);
  db.prepare("DELETE FROM episodes WHERE id = ?").run(epId);

  syncWriteToTurso("DELETE FROM watch_history WHERE episodeId = ?", [epId]);
  syncWriteToTurso("DELETE FROM episodes WHERE id = ?", [epId]);

  console.log(`[Episode Deletion]: Episode ${epId} permanently deleted from local SQLite & Turso Cloud.`);
  res.status(204).end();
}));


api.post("/admin/categories", auth, admin, safe(async (req, res) => {
  const name = z.string().min(2).parse(req.body.name);
  const catId = crypto.randomUUID();
  const catSlug = slug(name);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO categories (id, name, slug, description, image, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(catId, name, catSlug, req.body.description || "", req.body.image || "", now);

  syncWriteToTurso(
    "INSERT OR REPLACE INTO categories (id, name, slug, description, image, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [catId, name, catSlug, req.body.description || "", req.body.image || "", now]
  );

  const created = db.prepare("SELECT * FROM categories WHERE id = ?").get(catId);
  res.status(201).json({ ...(created as any), _id: catId });
}));


api.delete("/admin/categories/:id", auth, admin, safe(async (req, res) => {
  const catId = req.params.id;

  db.prepare("DELETE FROM categories WHERE id = ?").run(catId);
  syncWriteToTurso("DELETE FROM categories WHERE id = ?", [catId]);

  res.status(204).end();
}));

// Admin Analytics Endpoint
api.get("/admin/analytics", auth, admin, safe(async (_req, res) => {
  const totalUsersRow: any = db.prepare("SELECT COUNT(*) as c FROM users").get();
  const activeSubscribersRow: any = db.prepare("SELECT COUNT(*) as c FROM users WHERE subscriptionEndsAt IS NOT NULL AND datetime(subscriptionEndsAt) > datetime('now')").get();
  const totalSeriesRow: any = db.prepare("SELECT COUNT(*) as c FROM series").get();
  const totalEpisodesRow: any = db.prepare("SELECT COUNT(*) as c FROM episodes").get();
  const totalRevenueRow: any = db.prepare("SELECT SUM(amount) as s FROM subscriptions WHERE status = 'active' OR status = 'completed'").get();
  const totalWatchTimeRow: any = db.prepare("SELECT SUM(duration) as s FROM watch_history").get();

  const topSeries = db.prepare("SELECT id, title, views, thumbnail FROM series ORDER BY views DESC LIMIT 5").all();

  res.json({
    totalUsers: totalUsersRow?.c || 0,
    activeSubscribers: activeSubscribersRow?.c || 0,
    totalSeries: totalSeriesRow?.c || 0,
    totalEpisodes: totalEpisodesRow?.c || 0,
    totalRevenue: totalRevenueRow?.s || (activeSubscribersRow?.c || 0) * 39,
    totalWatchHours: Math.round(((totalWatchTimeRow?.s || 0) / 3600) * 10) / 10,
    topSeries: topSeries.map((s: any) => formatSeries(s))
  });
}));

// Global Announcements Endpoints
api.get("/announcements/active", safe(async (_req, res) => {
  const ann: any = db.prepare("SELECT * FROM site_announcements WHERE isActive = 1 ORDER BY createdAt DESC LIMIT 1").get();
  res.json(ann || null);
}));

api.get("/admin/announcements", auth, admin, safe(async (_req, res) => {
  const rows = db.prepare("SELECT * FROM site_announcements ORDER BY createdAt DESC").all();
  res.json(rows);
}));

api.post("/admin/announcements", auth, admin, safe(async (req, res) => {
  const d = z.object({
    message: z.string().min(2),
    link: z.string().optional().default(""),
    bgColor: z.string().optional().default("brand"),
    isActive: z.boolean().optional().default(true)
  }).parse(req.body);

  const annId = crypto.randomUUID();
  const now = new Date().toISOString();

  if (d.isActive) {
    db.prepare("UPDATE site_announcements SET isActive = 0").run();
  }

  db.prepare(`
    INSERT INTO site_announcements (id, message, link, bgColor, isActive, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(annId, d.message, d.link, d.bgColor, d.isActive ? 1 : 0, now);

  syncWriteToTurso(
    "INSERT OR REPLACE INTO site_announcements (id, message, link, bgColor, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [annId, d.message, d.link, d.bgColor, d.isActive ? 1 : 0, now]
  );

  const created = db.prepare("SELECT * FROM site_announcements WHERE id = ?").get(annId);
  res.status(201).json(created);
}));

api.delete("/admin/announcements/:id", auth, admin, safe(async (req, res) => {
  const annId = req.params.id;
  db.prepare("DELETE FROM site_announcements WHERE id = ?").run(annId);
  syncWriteToTurso("DELETE FROM site_announcements WHERE id = ?", [annId]);
  res.status(204).end();
}));

app.listen(port, "0.0.0.0", () => {
  console.log(`===================================================`);
  console.log(`  🚀 API Listening on http://0.0.0.0:${port}`);
  console.log(`  🛢️ Turso Cloud / SQLite Database Active`);
  console.log(`===================================================`);
});



