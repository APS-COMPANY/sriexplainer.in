import { createClient, Client } from "@libsql/client";
import { getDb } from "./db";
import fs from "fs";
import path from "path";

const TURSO_URL = process.env.TURSO_DATABASE_URL || "libsql://sri-explainer-db-neo36528a.aws-ap-south-1.turso.io";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYxMjI2MDEsImlkIjoiMDE5ZmRkMzMtMWUwMS03OGEyLTg2MGItYTUxZDUzOTVmMTE5Iiwia2lkIjoiVUZvSHVMZWRWcUhEUEhzeC1WR056VVlueDQ2enVTWWtyTVZKVEM0VWFiUSIsInJpZCI6IjBhYTViZTc2LTlmNjktNGQyMC05ODFmLTBmYzczMDIzYzg4ZiJ9.2h0DrGs05O4fF8cpWqL2Vx8Q0NVl9oMuNvarHkHg0jR4vsI2B-KbpPwPsk80affyixj-sUMDwZ059rJQdulgAA";

let client: Client | null = null;

export function getTursoClient(): Client {
  if (!client) {
    client = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN
    });
  }
  return client;
}

// Execute write query to Turso Cloud asynchronously
export function syncWriteToTurso(sql: string, args: any[] = []) {
  try {
    const turso = getTursoClient();
    turso.execute({ sql, args }).catch((err) => {
      console.error("[Turso Write Sync Error]:", err.message);
    });
  } catch (err: any) {
    console.error("[Turso Client Error]:", err.message);
  }
}

// Restore Database from Turso Cloud on Server Startup
export async function syncRestoreFromTursoCloud(): Promise<boolean> {
  try {
    console.log("[Turso Cloud Sync] Connecting to Turso Cloud Database...");
    const turso = getTursoClient();
    const db = getDb();

    // Ensure schema exists in Turso Cloud
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        role TEXT DEFAULT 'user',
        subscriptionEndsAt TEXT,
        activeSessionId TEXT DEFAULT '',
        xpCoins INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      );
    `);
    try { await turso.execute("ALTER TABLE users ADD COLUMN activeSessionId TEXT DEFAULT ''"); } catch {}
    try { await turso.execute("ALTER TABLE users ADD COLUMN xpCoins INTEGER DEFAULT 0"); } catch {}

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS series (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        originalTitle TEXT DEFAULT '',
        slug TEXT UNIQUE NOT NULL,
        type TEXT DEFAULT 'Series',
        description TEXT DEFAULT '',
        genre TEXT DEFAULT '',
        year TEXT DEFAULT '',
        status TEXT DEFAULT 'Completed',
        country TEXT DEFAULT '',
        thumbnail TEXT DEFAULT '',
        banner TEXT DEFAULT '',
        featured INTEGER DEFAULT 0,
        trending INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      );
    `);

    await turso.execute(`
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
    try { await turso.execute("ALTER TABLE series ADD COLUMN upcomingMessage TEXT DEFAULT ''"); } catch {}
    try { await turso.execute("ALTER TABLE episodes ADD COLUMN access TEXT DEFAULT 'public'"); } catch {}
    try { await turso.execute("ALTER TABLE episodes ADD COLUMN xpCost INTEGER DEFAULT 5"); } catch {}
    try { await turso.execute("ALTER TABLE episodes ADD COLUMN upcomingDisplayMessage TEXT DEFAULT ''"); } catch {}

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS episode_unlocks (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        episodeId TEXT NOT NULL,
        coinsPaid INTEGER DEFAULT 5,
        unlockedAt TEXT NOT NULL,
        UNIQUE(userId, episodeId)
      );
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balanceAfter INTEGER NOT NULL,
        description TEXT DEFAULT '',
        referenceId TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    await turso.execute(`
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

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS contest_scores (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        score INTEGER NOT NULL,
        submittedAt TEXT NOT NULL
      );
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS contest_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    try {
      await turso.execute(`ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';`);
    } catch {}

    try {
      await turso.execute(`ALTER TABLE subscriptions ADD COLUMN paymentId TEXT DEFAULT '';`);
    } catch {}

    await turso.execute(`
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

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        seriesId TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS watch_history (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        episodeId TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        currentPosition REAL DEFAULT 0,
        duration REAL DEFAULT 0,
        percentage REAL DEFAULT 0,
        completed INTEGER DEFAULT 0,
        updatedAt TEXT NOT NULL
      );
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS media_storage (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        data TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS site_announcements (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        link TEXT DEFAULT '',
        bgColor TEXT DEFAULT 'brand',
        isActive INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL
      );
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS watch_later (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        seriesId TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS login_history (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        ipAddress TEXT DEFAULT '',
        userAgent TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      );
    `);

    // Download series from Turso Cloud
    const remoteSeries = await turso.execute("SELECT * FROM series");
    console.log(`[Turso Cloud Sync] Retrieved ${remoteSeries.rows.length} series from Turso Cloud.`);

    if (remoteSeries.rows.length > 0) {
      for (const row of remoteSeries.rows) {
        db.prepare(`
          INSERT OR REPLACE INTO series (id, title, originalTitle, slug, type, description, genre, year, status, country, thumbnail, banner, featured, trending, views, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(row.id),
          String(row.title),
          String(row.originalTitle || ""),
          String(row.slug),
          String(row.type || "Series"),
          String(row.description || ""),
          String(row.genre || ""),
          String(row.year || ""),
          String(row.status || "Completed"),
          String(row.country || ""),
          String(row.thumbnail || ""),
          String(row.banner || ""),
          Number(row.featured || 0),
          Number(row.trending || 0),
          Number(row.views || 0),
          String(row.createdAt)
        );
      }
    }

    // Download episodes from Turso Cloud
    const remoteEpisodes = await turso.execute("SELECT * FROM episodes");
    console.log(`[Turso Cloud Sync] Retrieved ${remoteEpisodes.rows.length} episodes from Turso Cloud.`);
    if (remoteEpisodes.rows.length > 0) {
      for (const row of remoteEpisodes.rows) {
        db.prepare(`
          INSERT OR REPLACE INTO episodes (id, seriesId, number, title, rumbleEmbedUrl, duration, releaseDate, thumbnail, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(row.id),
          String(row.seriesId),
          Number(row.number),
          String(row.title),
          String(row.rumbleEmbedUrl),
          String(row.duration || ""),
          row.releaseDate ? String(row.releaseDate) : null,
          String(row.thumbnail || ""),
          String(row.createdAt)
        );
      }
    }

    // Download users from Turso Cloud
    const remoteUsers = await turso.execute("SELECT * FROM users");
    console.log(`[Turso Cloud Sync] Retrieved ${remoteUsers.rows.length} users from Turso Cloud.`);
    if (remoteUsers.rows.length > 0) {
      for (const row of remoteUsers.rows) {
        db.prepare(`
          INSERT OR REPLACE INTO users (id, name, email, password, avatar, role, subscriptionEndsAt, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(row.id),
          String(row.name),
          String(row.email),
          String(row.password),
          String(row.avatar || ""),
          String(row.role || "user"),
          row.subscriptionEndsAt ? String(row.subscriptionEndsAt) : null,
          String(row.createdAt)
        );
      }
    }

    // Download subscriptions from Turso Cloud
    const remoteSubs = await turso.execute("SELECT * FROM subscriptions");
    if (remoteSubs.rows.length > 0) {
      for (const row of remoteSubs.rows) {
        db.prepare(`
          INSERT OR REPLACE INTO subscriptions (id, userId, plan, amount, startsAt, endsAt, status, paymentId, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(row.id),
          String(row.userId),
          String(row.plan || "Monthly Premium"),
          Number(row.amount || 39),
          String(row.startsAt),
          String(row.endsAt),
          String(row.status || "active"),
          row.paymentId ? String(row.paymentId) : "",
          String(row.createdAt)
        );
      }
    }

    // Download reviews from Turso Cloud
    const remoteReviews = await turso.execute("SELECT * FROM reviews");
    if (remoteReviews.rows.length > 0) {
      for (const row of remoteReviews.rows) {
        db.prepare(`
          INSERT OR REPLACE INTO reviews (id, seriesId, userId, rating, comment, upvotes, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(row.id),
          String(row.seriesId),
          String(row.userId),
          Number(row.rating),
          String(row.comment),
          Number(row.upvotes || 0),
          String(row.createdAt)
        );
      }
    }

    // Download favorites from Turso Cloud
    const remoteFavorites = await turso.execute("SELECT * FROM favorites");
    if (remoteFavorites.rows.length > 0) {
      for (const row of remoteFavorites.rows) {
        db.prepare(`
          INSERT OR REPLACE INTO favorites (id, userId, seriesId, createdAt)
          VALUES (?, ?, ?, ?)
        `).run(
          String(row.id),
          String(row.userId),
          String(row.seriesId),
          String(row.createdAt)
        );
      }
    }

    // Download watch_history from Turso Cloud
    const remoteWatchHistory = await turso.execute("SELECT * FROM watch_history");
    if (remoteWatchHistory.rows.length > 0) {
      for (const row of remoteWatchHistory.rows) {
        db.prepare(`
          INSERT OR REPLACE INTO watch_history (id, userId, episodeId, progress, currentPosition, duration, percentage, completed, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(row.id),
          String(row.userId),
          String(row.episodeId),
          Number(row.progress || 0),
          Number(row.currentPosition || 0),
          Number(row.duration || 0),
          Number(row.percentage || 0),
          Number(row.completed || 0),
          String(row.updatedAt)
        );
      }
    }

    // Download media_storage from Turso Cloud & restore disk files to uploads/
    try {
      const remoteMedia = await turso.execute("SELECT * FROM media_storage");
      if (remoteMedia.rows.length > 0) {
        const uploadDir = path.resolve(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Restore media data into SQLite DB
        for (const row of remoteMedia.rows) {
          const filename = String(row.filename || row.id);
          db.prepare(`
            INSERT OR REPLACE INTO media_storage (id, filename, mimeType, data, createdAt)
            VALUES (?, ?, ?, ?, ?)
          `).run(String(row.id), filename, String(row.mimeType), String(row.data), String(row.createdAt));
        }

        // Write disk files asynchronously in background so server startup is instant & event loop is never blocked
        setTimeout(async () => {
          for (const row of remoteMedia.rows) {
            const filename = String(row.filename || row.id);
            const filepath = path.join(uploadDir, filename);
            if (!fs.existsSync(filepath) && row.data) {
              try {
                const buffer = Buffer.from(String(row.data), "base64");
                await fs.promises.writeFile(filepath, buffer);
              } catch (fileErr: any) {
                console.error(`[Media Cloud Sync Error] Failed to write ${filename}:`, fileErr.message);
              }
            }
          }
          console.log(`[Media Cloud Sync] Restored ${remoteMedia.rows.length} media files to disk asynchronously.`);
        }, 100);
      }
    } catch (mErr: any) {
      console.warn("[Media Sync Notice]:", mErr.message);
    }

    // Download site_announcements from Turso Cloud
    try {
      const remoteAnn = await turso.execute("SELECT * FROM site_announcements");
      if (remoteAnn.rows.length > 0) {
        for (const row of remoteAnn.rows) {
          db.prepare(`
            INSERT OR REPLACE INTO site_announcements (id, message, link, bgColor, isActive, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            String(row.id),
            String(row.message),
            String(row.link || ""),
            String(row.bgColor || "brand"),
            Number(row.isActive ?? 1),
            String(row.createdAt)
          );
        }
      }
    } catch (aErr: any) {
      console.warn("[Announcements Sync Notice]:", aErr.message);
    }

    console.log("[Turso Cloud Sync] Full database restore from Turso Cloud complete!");
    return true;
  } catch (err: any) {
    console.error("[Turso Cloud Restore Error]:", err.message);
    return false;
  }
}
