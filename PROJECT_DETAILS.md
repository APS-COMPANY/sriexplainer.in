# 📖 Sri Explainer Platform — Complete Technical & Functional Guide

**Sri Explainer** (`https://sriexplainer.in`) is an entertainment streaming web application for Tamil & Indian comic explanations, anime recaps, and exclusive video breakdowns.

---

## 🎯 Architecture Summary

- **Frontend:** Next.js 15 App Router (`/frontend`)
- **Backend API:** Built-in Next.js Route Handlers (`/app/api/...`)
- **Database Engine:** Turso LibSQL (Cloud SQLite with Edge replicas)
- **Video Delivery:** Rumble Iframe Embed Engine (`rumble.com/embed/...`)
- **Payment Processing:** Cashfree Payment Gateway (UPI / QR / NetBanking / Cards)
- **Monetization:** HilltopAds Anti-AdBlock Popunder system (Ad-Free for VIPs)
- **App Wrappers:** Capacitor (Android APK) & Electron (Windows EXE)

---

## 💎 Core Systems & Features

### 1. 🪙 XP Coin Economy
- Users earn or purchase XP Coins.
- Episodes can be flagged as:
  - **Free:** Anyone can watch immediately.
  - **VIP Only:** Accessible exclusively to active VIP subscribers.
  - **XP Coin Unlock:** Free users can unlock individual episodes using custom XP amounts set by admin.
- Once unlocked with XP Coins, access is permanent for that user account.

### 2. 👑 VIP Membership Subscriptions
- Handled via Cashfree Payment Gateway.
- Auto-verified on client callback and secured via server webhook.
- Features for VIP users:
  - 🚫 100% Ad-Free (no popunders or banner ads).
  - ⚡ Instant Early Access to new releases.
  - 🌟 Exclusive VIP golden badge in comments.

### 3. 🎬 Rumble Streaming Engine
- Custom overlay over official Rumble iframe players.
- Theater Mode, Fullscreen, and Floating PiP Player.
- Quality Badges: Displays 4K, 1080P, or 720P on series cards and watch pages.
- Auto-advance to next episode in playlist.

### 4. 📢 HilltopAds Anti-AdBlock Integration
- Automatically injects anti-adblock popunder scripts for free visitors.
- Completely disabled for logged-in VIP members and Admins.
- Includes `no-referrer-when-downgrade` meta tag for maximum advertiser payouts.

### 5. 🛠️ Admin Dashboard (`/admin`)
- **Series & Episodes:** Create, edit, set scheduled countdowns, customize XP price, reorder episodes.
- **Subscriptions:** View all transactions, extend VIP days, grant free access, cancel access.
- **XP Coins:** Credit or refund coins to any user by email.
- **Firewall & Security:** Inspect blocked requests, rate limit stats, and security logs.
- **Excel Export:** Download customer and order reports in `.xlsx` format.

---

## 📡 API Endpoints Cheat-Sheet

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/series` | Returns series catalog with batch-loaded episode counts & badges |
| `GET` | `/api/series/[slug]` | Detailed series information with all episodes |
| `GET` | `/api/episodes` | List latest episodes |
| `GET` | `/api/upcoming` | List scheduled upcoming episodes with countdown dates |
| `POST` | `/api/episodes/[id]/unlock` | Unlock episode using XP coins |
| `POST` | `/api/episodes/[id]/hype` | Increment hype counter |
| `POST` | `/api/cashfree/create-order` | Create payment order for VIP subscription |
| `POST` | `/api/cashfree/verify` | Verify payment signature and activate VIP |
| `GET` | `/api/me` | Fetch active user session, VIP status, and XP coin balance |
| `POST` | `/api/admin/episodes` | Create new episode |
| `PUT` | `/api/admin/episodes/[id]` | Update episode details and XP price |
| `POST` | `/api/admin/xp-coins/grant` | Grant XP coins to user |

---

## 🚀 Deployment & Operations

- Hosted on **Vercel** connected to GitHub repository **`APS-COMPANY/sriexplainer.in`** on branch `main`.
- All database state lives permanently in **Turso Database**; pushing code never modifies or wipes database records.
- Zero breaking changes guaranteed.
