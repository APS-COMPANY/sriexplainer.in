import { createClient, Client } from "@libsql/client";
import bcrypt from "bcryptjs";

const rawUrl = (process.env.TURSO_DATABASE_URL || "libsql://sri-explainer-db-neo36528a.aws-ap-south-1.turso.io").trim();
const TURSO_URL = rawUrl.replace(/^libsql:\/\//, "https://");
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN || "").trim();

let tursoClient: Client | null = null;

export function getTursoClient(): Client {
  if (!tursoClient) {
    tursoClient = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN
    });
  }
  return tursoClient;
}

let schemaInitialized = false;

export async function initTursoSchema() {
  if (schemaInitialized) return;
  const client = getTursoClient();

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        role TEXT DEFAULT 'user',
        subscriptionEndsAt TEXT,
        activeSessionId TEXT DEFAULT '',
        xpCoins INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      );
    `);
    try { await client.execute("ALTER TABLE users ADD COLUMN activeSessionId TEXT DEFAULT ''"); } catch {}
    try { await client.execute("ALTER TABLE users ADD COLUMN xpCoins INTEGER DEFAULT 0"); } catch {}

    await client.execute(`
      CREATE TABLE IF NOT EXISTS series (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        originalTitle TEXT DEFAULT '',
        slug TEXT UNIQUE NOT NULL,
        type TEXT DEFAULT 'Series',
        description TEXT DEFAULT '',
        genre TEXT DEFAULT '',
        genres TEXT DEFAULT '[]',
        year TEXT DEFAULT '',
        status TEXT DEFAULT 'Completed',
        country TEXT DEFAULT '',
        thumbnail TEXT DEFAULT '',
        banner TEXT DEFAULT '',
        logo TEXT DEFAULT '',
        creator TEXT DEFAULT '',
        language TEXT DEFAULT 'English',
        rating TEXT DEFAULT 'PG-13',
        visibility TEXT DEFAULT 'public',
        isUpcoming INTEGER DEFAULT 0,
        featured INTEGER DEFAULT 0,
        trending INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      );
    `);

    try { await client.execute("ALTER TABLE series ADD COLUMN genres TEXT DEFAULT '[]'"); } catch {}
    try { await client.execute("ALTER TABLE series ADD COLUMN logo TEXT DEFAULT ''"); } catch {}
    try { await client.execute("ALTER TABLE series ADD COLUMN creator TEXT DEFAULT ''"); } catch {}
    try { await client.execute("ALTER TABLE series ADD COLUMN language TEXT DEFAULT 'English'"); } catch {}
    try { await client.execute("ALTER TABLE series ADD COLUMN rating TEXT DEFAULT 'PG-13'"); } catch {}
    try { await client.execute("ALTER TABLE series ADD COLUMN visibility TEXT DEFAULT 'public'"); } catch {}
    try { await client.execute("ALTER TABLE series ADD COLUMN isUpcoming INTEGER DEFAULT 0"); } catch {}
    try { await client.execute("ALTER TABLE series ADD COLUMN upcomingMessage TEXT DEFAULT ''"); } catch {}

    await client.execute(`
      CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        seriesId TEXT NOT NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        rumbleEmbedUrl TEXT NOT NULL,
        duration TEXT DEFAULT '',
        quality TEXT DEFAULT '1080P',
        visibility TEXT DEFAULT 'public',
        access TEXT DEFAULT 'public',
        xpCost INTEGER DEFAULT 5,
        releaseDate TEXT,
        thumbnail TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    try { await client.execute("ALTER TABLE episodes ADD COLUMN quality TEXT DEFAULT '1080P'"); } catch {}
    try { await client.execute("ALTER TABLE episodes ADD COLUMN visibility TEXT DEFAULT 'public'"); } catch {}
    try { await client.execute("ALTER TABLE episodes ADD COLUMN access TEXT DEFAULT 'public'"); } catch {}
    try { await client.execute("ALTER TABLE episodes ADD COLUMN xpCost INTEGER DEFAULT 5"); } catch {}
    try { await client.execute("ALTER TABLE episodes ADD COLUMN scheduledReleaseAt TEXT DEFAULT NULL"); } catch {}
    try { await client.execute("ALTER TABLE episodes ADD COLUMN upcomingDisplayMessage TEXT DEFAULT ''"); } catch {}
    try { await client.execute("ALTER TABLE episodes ADD COLUMN likesCount INTEGER DEFAULT 0"); } catch {}
    try { await client.execute("ALTER TABLE episodes ADD COLUMN hypeCount INTEGER DEFAULT 0"); } catch {}
    try { await client.execute("ALTER TABLE episodes ADD COLUMN views INTEGER DEFAULT 0"); } catch {}

    await client.execute(`
      CREATE TABLE IF NOT EXISTS episode_likes (
        id TEXT PRIMARY KEY,
        episodeId TEXT NOT NULL,
        userId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(episodeId, userId)
      );
    `);
    try { await client.execute("ALTER TABLE episode_likes ADD COLUMN id TEXT"); } catch {}

    await client.execute(`
      CREATE TABLE IF NOT EXISTS episode_view_events (
        id TEXT PRIMARY KEY,
        episodeId TEXT NOT NULL,
        userId TEXT DEFAULT '',
        sessionId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(episodeId, sessionId)
      );
    `);
    try { await client.execute("ALTER TABLE episode_view_events ADD COLUMN id TEXT"); } catch {}

    await client.execute(`
      CREATE TABLE IF NOT EXISTS episode_hypes (
        id TEXT PRIMARY KEY,
        episodeId TEXT NOT NULL,
        userId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(episodeId, userId)
      );
    `);
    try { await client.execute("ALTER TABLE episode_hypes ADD COLUMN id TEXT"); } catch {}

    // XP Coins Episode Unlocks & Transaction History Tables
    await client.execute(`
      CREATE TABLE IF NOT EXISTS episode_unlocks (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        episodeId TEXT NOT NULL,
        coinsPaid INTEGER DEFAULT 5,
        unlockedAt TEXT NOT NULL,
        UNIQUE(userId, episodeId)
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balanceBefore INTEGER DEFAULT 0,
        balanceAfter INTEGER NOT NULL,
        description TEXT DEFAULT '',
        referenceId TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);
    try { await client.execute("ALTER TABLE xp_transactions ADD COLUMN balanceBefore INTEGER DEFAULT 0"); } catch {}
    try { await client.execute("ALTER TABLE series ADD COLUMN posterBadges TEXT DEFAULT NULL"); } catch {}

    await client.execute(`
      CREATE TABLE IF NOT EXISTS episode_notifications (
        id TEXT PRIMARY KEY,
        episodeId TEXT UNIQUE NOT NULL,
        notificationType TEXT NOT NULL,
        status TEXT NOT NULL,
        sentAt TEXT NOT NULL
      );
    `);

    // Automatic migration of legacy subscription episodes & active VIP members
    try {
      await client.execute("UPDATE episodes SET access = 'xp_coins', xpCost = 5 WHERE access IN ('premium', 'subscription') OR access IS NULL OR access = ''");
      
      const nowIso = new Date().toISOString();
      const activeSubs = await client.execute({
        sql: "SELECT id, email, subscriptionEndsAt FROM users WHERE subscriptionEndsAt IS NOT NULL AND subscriptionEndsAt > ? AND (xpCoins IS NULL OR xpCoins = 0)",
        args: [nowIso]
      });

      for (const u of activeSubs.rows) {
        const userId = String(u.id);
        const txId = `tx_mig_${crypto.randomUUID().slice(0, 8)}`;
        await client.execute({
          sql: "UPDATE users SET xpCoins = 100 WHERE id = ?",
          args: [userId]
        });
        await client.execute({
          sql: "INSERT INTO xp_transactions (id, userId, type, amount, balanceBefore, balanceAfter, description, referenceId, createdAt) VALUES (?, ?, 'ADMIN_GRANT', 100, 0, 100, 'Legacy VIP Subscription Migration', ?, ?)",
          args: [txId, userId, `mig_${userId}`, nowIso]
        });
      }
    } catch (migErr) {
      console.warn("[DB Migration Notice]: XP Coins migration check warning:", migErr);
    }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        plan TEXT DEFAULT 'Monthly Premium',
        amount REAL DEFAULT 39,
        startsAt TEXT NOT NULL,
        endsAt TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        paymentId TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        seriesId TEXT NOT NULL,
        userId TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        upvotes INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        seriesId TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS contest_scores (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        score INTEGER NOT NULL,
        submittedAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS contest_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS watch_history (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        episodeId TEXT NOT NULL,
        progress REAL DEFAULT 0,
        currentPosition REAL DEFAULT 0,
        duration REAL DEFAULT 0,
        percentage REAL DEFAULT 0,
        completed INTEGER DEFAULT 0,
        updatedAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS site_announcements (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        link TEXT DEFAULT '',
        bgColor TEXT DEFAULT 'brand',
        isActive INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS episode_comments (
        id TEXT PRIMARY KEY,
        episodeId TEXT NOT NULL,
        userId TEXT DEFAULT '',
        guestName TEXT DEFAULT '',
        parentId TEXT,
        content TEXT NOT NULL,
        likesCount INTEGER DEFAULT 0,
        isPinned INTEGER DEFAULT 0,
        isHidden INTEGER DEFAULT 0,
        isEdited INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_reports (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userEmail TEXT,
        issueType TEXT NOT NULL,
        description TEXT NOT NULL,
        contactInfo TEXT,
        pageRoute TEXT,
        status TEXT DEFAULT 'OPEN',
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS app_errors (
        id TEXT PRIMARY KEY,
        errorType TEXT NOT NULL,
        message TEXT NOT NULL,
        route TEXT DEFAULT '',
        statusCode INTEGER DEFAULT 500,
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id TEXT PRIMARY KEY,
        commentId TEXT NOT NULL,
        userId TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS media_storage (
        id TEXT PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        mimeType TEXT DEFAULT 'image/png',
        data TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS login_history (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        ipAddress TEXT DEFAULT '',
        userAgent TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id TEXT PRIMARY KEY,
        eventType TEXT NOT NULL,
        email TEXT DEFAULT '',
        ipAddress TEXT DEFAULT '',
        userAgent TEXT DEFAULT '',
        details TEXT DEFAULT '',
        statusCode INTEGER DEFAULT 401,
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        image TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS hero_slideshows (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        slotIndex INTEGER NOT NULL,
        seriesId TEXT DEFAULT '',
        title TEXT DEFAULT '',
        subtitle TEXT DEFAULT '',
        description TEXT DEFAULT '',
        heroImage TEXT DEFAULT '',
        buttonText TEXT DEFAULT 'Watch Now',
        buttonLink TEXT DEFAULT '',
        isSlotVisible INTEGER DEFAULT 1,
        updatedAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS hero_categories_settings (
        category TEXT PRIMARY KEY,
        isVisible INTEGER DEFAULT 1,
        updatedAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS ip_bans (
        ipAddress TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        attackType TEXT NOT NULL,
        payload TEXT DEFAULT '',
        bannedAt TEXT NOT NULL,
        expiresAt TEXT DEFAULT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id TEXT PRIMARY KEY,
        eventType TEXT NOT NULL,
        email TEXT DEFAULT '',
        ipAddress TEXT DEFAULT '',
        userAgent TEXT DEFAULT '',
        details TEXT DEFAULT '',
        statusCode INTEGER DEFAULT 401,
        createdAt TEXT NOT NULL
      );
    `);

    schemaInitialized = true;
    await ensureDefaultAdmins();
    await ensureDefaultHeroSlideshows();
  } catch (err) {
    console.error("[Turso Schema Init Notice]:", err);
  }
}

async function ensureDefaultHeroSlideshows() {
  const client = getTursoClient();
  const categories = ["popular", "upcoming", "most_viewed"];

  for (const cat of categories) {
    try {
      const catCheck = await client.execute({
        sql: "SELECT * FROM hero_categories_settings WHERE category = ?",
        args: [cat]
      });
      if (catCheck.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO hero_categories_settings (category, isVisible, updatedAt) VALUES (?, 1, ?)",
          args: [cat, new Date().toISOString()]
        });
      }
    } catch {}

    for (let slot = 1; slot <= 6; slot++) {
      try {
        const slotCheck = await client.execute({
          sql: "SELECT * FROM hero_slideshows WHERE category = ? AND slotIndex = ?",
          args: [cat, slot]
        });
        if (slotCheck.rows.length === 0) {
          const id = `slide_${cat}_${slot}`;
          await client.execute({
            sql: `INSERT INTO hero_slideshows (id, category, slotIndex, seriesId, title, subtitle, description, heroImage, buttonText, buttonLink, isSlotVisible, updatedAt)
                  VALUES (?, ?, ?, '', '', '', '', '', 'Watch Now', '', 1, ?)`,
            args: [id, cat, slot, new Date().toISOString()]
          });
        }
      } catch {}
    }
  }

  try {
    const seriesRows = await client.execute("SELECT id, title, description, banner, thumbnail FROM series ORDER BY views DESC LIMIT 6");
    if (seriesRows.rows.length > 0) {
      for (const cat of categories) {
        for (let slot = 1; slot <= Math.min(6, seriesRows.rows.length); slot++) {
          const s: any = seriesRows.rows[slot - 1];
          const slotId = `slide_${cat}_${slot}`;
          await client.execute({
            sql: `UPDATE hero_slideshows
                  SET seriesId = ?, title = ?, description = ?, heroImage = ?
                  WHERE id = ? AND (seriesId IS NULL OR seriesId = '' OR title IS NULL OR title = '')`,
            args: [s.id, s.title, s.description || "", s.banner || s.thumbnail || "", slotId]
          });
        }
      }
    }
  } catch {}
}

async function ensureDefaultAdmins() {
  const client = getTursoClient();
  const defaultAdmins = [
    { email: "appua26145@gmail.com", name: "Sri Explainer Admin", pass: "Sriexplainer" },
    { email: "dddr04268@gmail.com", name: "Main Admin", pass: "Sriexplainer" }
  ];

  for (const admin of defaultAdmins) {
    try {
      const existing = await client.execute({
        sql: "SELECT * FROM users WHERE email = ?",
        args: [admin.email]
      });

      if (existing.rows.length === 0) {
        const id = crypto.randomUUID();
        const hash = await bcrypt.hash(admin.pass, 10);
        await client.execute({
          sql: "INSERT INTO users (id, name, email, password, role, createdAt) VALUES (?, ?, ?, ?, 'admin', ?)",
          args: [id, admin.name, admin.email, hash, new Date().toISOString()]
        });
      } else {
        const u: any = existing.rows[0];
        const isBcrypt = typeof u.password === "string" && (u.password.startsWith("$2a$") || u.password.startsWith("$2b$"));
        if (!isBcrypt || u.role !== "admin") {
          const hash = isBcrypt ? u.password : await bcrypt.hash(admin.pass, 10);
          await client.execute({
            sql: "UPDATE users SET role = 'admin', password = ? WHERE id = ?",
            args: [hash, u.id]
          });
        }
      }
    } catch (e) {
      console.warn("[Admin Seed Notice]:", e);
    }
  }
}

export async function tursoQuery(sql: string, args: any[] = []): Promise<any[]> {
  const client = getTursoClient();
  const res = await client.execute({ sql, args });
  return res.rows.map((row) => {
    const obj: any = {};
    res.columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

export async function tursoQueryOne(sql: string, args: any[] = []): Promise<any | null> {
  const rows = await tursoQuery(sql, args);
  return rows.length > 0 ? rows[0] : null;
}

export async function tursoExecute(sql: string, args: any[] = []): Promise<void> {
  const client = getTursoClient();
  await client.execute({ sql, args });
}
