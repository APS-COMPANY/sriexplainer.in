import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export function getDbFilePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.resolve("/tmp", "sri_explainer.db");
  }
  return path.resolve(__dirname, "../sri_explainer.db");
}

let _dbInstance: InstanceType<typeof Database> | null = null;

export function getDb(): InstanceType<typeof Database> {
  if (!_dbInstance) {
    const filePath = getDbFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _dbInstance = new Database(filePath);
    _dbInstance.pragma("journal_mode = WAL");
    _dbInstance.pragma("foreign_keys = ON");
  }
  return _dbInstance;
}

export function closeDb() {
  if (_dbInstance) {
    try {
      _dbInstance.close();
    } catch {}
    _dbInstance = null;
  }
}

export const db = new Proxy({} as InstanceType<typeof Database>, {
  get(_target, prop) {
    const instance = getDb() as any;
    const value = instance[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  }
});

// Initialize Database Schema
export function initDb() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT DEFAULT '',
      subscriptionEndsAt TEXT,
      activeSessionId TEXT DEFAULT '',
      xpCoins INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    );
  `);
  try { database.exec("ALTER TABLE users ADD COLUMN activeSessionId TEXT DEFAULT ''"); } catch {}
  try { database.exec("ALTER TABLE users ADD COLUMN xpCoins INTEGER DEFAULT 0"); } catch {}

  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS series (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      originalTitle TEXT DEFAULT '',
      slug TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'Series',
      description TEXT NOT NULL,
      genres TEXT DEFAULT '[]',
      status TEXT DEFAULT 'ongoing',
      year INTEGER,
      studio TEXT DEFAULT '',
      country TEXT DEFAULT '',
      thumbnail TEXT DEFAULT '',
      banner TEXT DEFAULT '',
      creator TEXT DEFAULT '',
      featured INTEGER DEFAULT 0,
      trending INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    try { database.exec("ALTER TABLE series ADD COLUMN creator TEXT DEFAULT ''"); } catch {}
    try { database.exec("ALTER TABLE series ADD COLUMN upcomingMessage TEXT DEFAULT ''"); } catch {}

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
      createdAt TEXT NOT NULL,
      FOREIGN KEY (seriesId) REFERENCES series(id) ON DELETE CASCADE
    );
    try { database.exec("ALTER TABLE episodes ADD COLUMN access TEXT DEFAULT 'public'"); } catch {}
    try { database.exec("ALTER TABLE episodes ADD COLUMN xpCost INTEGER DEFAULT 5"); } catch {}
    try { database.exec("ALTER TABLE episodes ADD COLUMN scheduledReleaseAt TEXT DEFAULT NULL"); } catch {}
    try { database.exec("ALTER TABLE episodes ADD COLUMN upcomingDisplayMessage TEXT DEFAULT ''"); } catch {}

    CREATE TABLE IF NOT EXISTS episode_likes (
      id TEXT PRIMARY KEY,
      episodeId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(episodeId, userId),
      FOREIGN KEY (episodeId) REFERENCES episodes(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS episode_view_events (
      id TEXT PRIMARY KEY,
      episodeId TEXT NOT NULL,
      userId TEXT DEFAULT '',
      sessionId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(episodeId, sessionId),
      FOREIGN KEY (episodeId) REFERENCES episodes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS episode_unlocks (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      episodeId TEXT NOT NULL,
      coinsPaid INTEGER DEFAULT 5,
      unlockedAt TEXT NOT NULL,
      UNIQUE(userId, episodeId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (episodeId) REFERENCES episodes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS xp_transactions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balanceBefore INTEGER DEFAULT 0,
      balanceAfter INTEGER NOT NULL,
      description TEXT DEFAULT '',
      referenceId TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      seriesId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(userId, seriesId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (seriesId) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contest_scores (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      score INTEGER NOT NULL,
      submittedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contest_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      episodeId TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      updatedAt TEXT NOT NULL,
      UNIQUE(userId, episodeId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (episodeId) REFERENCES episodes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      razorpayOrderId TEXT,
      razorpayPaymentId TEXT,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'created',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      plan TEXT DEFAULT 'Monthly Premium',
      amount REAL DEFAULT 39,
      startsAt TEXT NOT NULL,
      endsAt TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      paymentId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      seriesId TEXT NOT NULL,
      userId TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      upvotes INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      UNIQUE(userId, seriesId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (seriesId) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_upvotes (
      id TEXT PRIMARY KEY,
      reviewId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(reviewId, userId),
      FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS app_errors (
      id TEXT PRIMARY KEY,
      errorType TEXT NOT NULL,
      message TEXT NOT NULL,
      route TEXT DEFAULT '',
      statusCode INTEGER DEFAULT 500,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      episodeId TEXT NOT NULL,
      userId TEXT NOT NULL,
      parentId TEXT,
      content TEXT NOT NULL,
      likesCount INTEGER DEFAULT 0,
      isPinned INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (episodeId) REFERENCES episodes(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS media_storage (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      data TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comment_likes (
      commentId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (commentId, userId),
      FOREIGN KEY (commentId) REFERENCES comments(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      actorId TEXT NOT NULL,
      type TEXT NOT NULL,
      commentId TEXT,
      episodeId TEXT,
      message TEXT NOT NULL,
      isRead INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (actorId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_announcements (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      link TEXT DEFAULT '',
      bgColor TEXT DEFAULT 'brand',
      isActive INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS featured_slides (
      id TEXT PRIMARY KEY,
      seriesId TEXT DEFAULT '',
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      heroImage TEXT DEFAULT '',
      badge TEXT DEFAULT 'FEATURED',
      quality TEXT DEFAULT '4K ULTRA HD',
      year INTEGER DEFAULT 2026,
      displayOrder INTEGER DEFAULT 1,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watch_later (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      seriesId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(userId, seriesId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (seriesId) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS login_history (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      ipAddress TEXT DEFAULT '',
      userAgent TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS ip_bans (
      ipAddress TEXT PRIMARY KEY,
      reason TEXT NOT NULL,
      attackType TEXT NOT NULL,
      payload TEXT DEFAULT '',
      bannedAt TEXT NOT NULL,
      expiresAt TEXT DEFAULT NULL
    );
  `);

  // Migrate existing tables to add new columns safely
  const addCol = (table: string, colDef: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
    } catch {
      // Column already exists
    }
  };

  // User table migrations
  addCol("users", "phone TEXT DEFAULT ''");

  // XP transactions migrations
  addCol("xp_transactions", "balanceBefore INTEGER DEFAULT 0");

  // Comments table migrations
  addCol("comments", "isHidden INTEGER DEFAULT 0");
  addCol("comments", "isEdited INTEGER DEFAULT 0");

  // Series table migrations
  addCol("series", "originalTitle TEXT DEFAULT ''");
  addCol("series", "type TEXT DEFAULT 'Series'");
  addCol("series", "genre TEXT DEFAULT ''");
  addCol("series", "genres TEXT DEFAULT ''");
  addCol("series", "logo TEXT DEFAULT ''");
  addCol("series", "language TEXT DEFAULT 'English'");
  addCol("series", "rating TEXT DEFAULT 'PG-13'");
  addCol("series", "visibility TEXT DEFAULT 'public'");
  addCol("series", "isUpcoming INTEGER DEFAULT 0");
  addCol("series", "releaseDate TEXT");
  addCol("series", "isMovie INTEGER DEFAULT 0");
  addCol("series", "clicks INTEGER DEFAULT 0");
  addCol("series", "watchTime INTEGER DEFAULT 0");
  addCol("series", "videoUrl TEXT DEFAULT ''");
  addCol("series", "scheduledAt TEXT");

  // Episodes table migrations
  addCol("episodes", "quality TEXT DEFAULT '1080P'");
  addCol("episodes", "visibility TEXT DEFAULT 'public'");
  addCol("episodes", "isUpcoming INTEGER DEFAULT 0");
  addCol("episodes", "clicks INTEGER DEFAULT 0");
  addCol("episodes", "views INTEGER DEFAULT 0");
  addCol("episodes", "likesCount INTEGER DEFAULT 0");
  addCol("episodes", "watchTime INTEGER DEFAULT 0");
  addCol("episodes", "commentsDisabled INTEGER DEFAULT 0");
  addCol("episodes", "commentsLocked INTEGER DEFAULT 0");
  addCol("episodes", "scheduledAt TEXT");

  // Watch history table migrations
  addCol("watch_history", "currentPosition REAL DEFAULT 0");
  addCol("watch_history", "duration REAL DEFAULT 0");
  addCol("watch_history", "percentage REAL DEFAULT 0");
  addCol("watch_history", "completed INTEGER DEFAULT 0");
  addCol("watch_history", "lastWatched TEXT");

  // Seed/Sync Default Admin Users
  const adminEmails = ["appua26145@gmail.com", "dddr04268@gmail.com"];
  if (process.env.ADMIN_EMAIL) {
    process.env.ADMIN_EMAIL.split(",").forEach((e) => {
      const clean = e.trim().toLowerCase();
      if (clean && !adminEmails.includes(clean)) adminEmails.push(clean);
    });
  }
  const adminPassword = process.env.ADMIN_PASSWORD || "Sriexplainer";
  const hashedPassword = bcrypt.hashSync(adminPassword, 12);

  for (const email of adminEmails) {
    const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    const adminRecord = {
      name: "Administrator",
      email: email,
      password: hashedPassword,
      role: "admin",
      createdAt: new Date().toISOString()
    };

    if (!existing) {
      const adminId = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(adminId, "Administrator", email, hashedPassword, "admin", now);
      console.log(`[Database] Auto-created Admin Account: ${email}`);
    }
    db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);
    console.log(`[Database] Verified Admin Account role: ${email}`);
  }

  // Seed Default Content
  ensureDefaultSeed();
}

export function ensureDefaultSeed() {
  // No fake sample series auto-seeding. Only real user content exists.
}



