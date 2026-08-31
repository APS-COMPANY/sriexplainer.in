# 🎬 Sri Explainer — Premium Comic & Anime Explanations

> **Official Website:** [https://sriexplainer.in](https://sriexplainer.in)  
> **Platform Description:** High-performance video streaming web application designed for comic explanations, anime breakdowns, and exclusive story narratives with VIP memberships and XP Coin gamification.

---

## 🌟 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Video Player & Streaming Engine](#-video-player--streaming-engine)
- [Monetization & Economy System](#-monetization--economy-system)
- [Security & Ad-Block Policy](#-security--ad-block-policy)
- [Multi-Platform Support](#-multi-platform-support)
- [Admin Control Center](#-admin-control-center)
- [Tech Stack & Architecture](#-tech-stack--architecture)
- [Database & Data Safety](#-database--data-safety)
- [Installation & Local Setup](#-installation--local-setup)

---

## 📖 Overview

**Sri Explainer** is a full-featured streaming portal built specifically for comic and anime explanation content creators. The architecture is engineered for ultra-fast page loads, minimal serverless CPU execution, edge CDN caching, and seamless cross-device compatibility (Mobile, Tablet, Desktop, and PWA/Android/Desktop Native Apps).

---

## 🚀 Key Features

### 1. 📺 Streaming & Content Catalog
- **Series & Episodes Management:** Categorized catalog with multi-genre tagging, release years, status (`Ongoing`, `Completed`, `Upcoming`), and popularity sorting.
- **Smart Quality Badging:** High-definition corner badges displaying video resolutions (`4K`, `1080P`, `720P`).
- **Live Scheduled Releases:** Real-time countdown timer for upcoming episodes with automatic unlock upon release date/time.
- **Watch History & Resume:** Track video progress and continue watching exactly where you left off.
- **My List & Watch Later:** Personalized bookmarking and favorites list for users.
- **Interactive Community:** Timestamped comments, nested comment replies, likes, and admin-pinned highlights.

---

### 2. 💎 Monetization & Economy System

- **👑 VIP Subscription Membership:**
  - Integrated with **Cashfree Payment Gateway** supporting UPI, Credit/Debit Cards, and NetBanking.
  - Automatic instant activation upon payment verification or webhook confirmation.
  - Grants 100% Ad-Free viewing, early access episodes, and premium badge styling.
- **🪙 XP Coins (Gamification & Pay-Per-Episode):**
  - Users can purchase or earn XP Coins.
  - Administrators can set a customizable coin price per episode (e.g., 1, 2, 5, 10 XP).
  - Permanent episode unlocks stored in the database with full transaction ledger.
- **📢 Optimized Ad Monetization (HilltopAds Anti-AdBlock):**
  - Integrated Anti-AdBlock Popunder system with revenue-boosting referrer policies.
  - **VIP Exemption:** Ads are strictly disabled for VIP subscribers and Administrators.
  - Built-in AdBlock Detector prompt to encourage whitelisting or VIP subscription.

---

### 3. 🛡️ Video Player & Streaming Engine

- **100% Compliant Rumble Player:** Embeds official Rumble iframe players (`https://rumble.com/embed/...`).
- **Custom Player Features:**
  - Floating Picture-in-Picture (PiP) player when scrolling down pages.
  - Theater Mode and Fullscreen toggles.
  - Playback speed control (0.5x, 1x, 1.25x, 1.5x, 2x).
  - Next Episode auto-advance and episode selector carousel.
  - Light/Dark lighting mode toggle.

---

### 4. 📱 Multi-Platform Support

Sri Explainer is built to run everywhere:
- **Web App:** Modern Next.js 15 PWA with service worker caching, install banner, and offline indicator.
- **Android App:** Built via `@capacitor/android` for native Android deployment.
- **Desktop Application:** Packaged via `electron-builder` for Windows executable deployment.

---

### 5. 🛠️ Admin Control Center

Protected admin dashboard accessible by authorized super-admins and co-admins:
- **Episode & Series Editor:** Instant title, thumbnail, description, Rumble embed code, release date, and XP price customization.
- **User & Subscription Management:** Manual VIP access grants, subscription extensions, and cancellations.
- **XP Coin Granting & Refunds:** Ability to manually credit or refund XP Coins to users.
- **Site Announcements & Banners:** Publish live top announcement bars with custom links.
- **Firewall & Rate Limiting:** Real-time threat detection, IP inspection, and security guards.
- **SEO Analyzer & Health Metrics:** Real-time Core Web Vitals, dynamic `sitemap.xml`, and metadata generator.
- **Excel Report Exports:** Download revenue, user growth, and episode analytics in `.xlsx` format.

---

## 🏗️ Tech Stack & Architecture

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling & UI** | Tailwind CSS, Lucide Icons, Framer Motion |
| **State & Data Fetching** | TanStack React Query v5, Axios |
| **Database** | Turso / LibSQL (Global Edge Serverless SQLite) |
| **Payments** | Cashfree Payments SDK & Webhooks |
| **Ad Network** | HilltopAds Anti-AdBlock Engine |
| **Deployment** | Vercel Edge Serverless with Edge CDN Caching |
| **Mobile & Desktop** | Capacitor (Android) & Electron (Desktop) |

---

## 🔒 Security & Performance Optimizations

1. **Eliminated N+1 Database Queries:** All series and episode lookups use single-query batch mapping, cutting serverless CPU overhead by 90%+.
2. **Edge CDN Caching:** Public endpoints (`/api/series`, `/api/episodes`, `/api/upcoming`) utilize `stale-while-revalidate` caching.
3. **Security Guard:** DevTools inspection blockers, right-click protection, framed iframe blockers, and strict Content Security Policies (CSP).
4. **Referrer Policy:** `no-referrer-when-downgrade` enabled to pass verified traffic to advertisers for maximum CPM payout.

---

## 🛡️ Production Safety Rules

This codebase follows strict production safety protocols:
- **Persistent Data:** Never overwrite or reset the production database.
- **Source Code Exclusivity:** Production credentials and dynamic database state remain external and persistent.
- **Zero Breaking Changes:** Every deployment preserves all series, episodes, user accounts, comments, watch histories, and coin balances.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or yarn

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/APS-COMPANY/sriexplainer.in.git
   cd sriexplainer.in
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd frontend && npm install
   ```

3. **Configure Environment Variables:**
   Create `.env.local` inside `frontend/` with your credentials:
   ```env
   TURSO_DATABASE_URL=libsql://...
   TURSO_AUTH_TOKEN=...
   JWT_SECRET=...
   CASHFREE_APP_ID=...
   CASHFREE_SECRET_KEY=...
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   ```

---

## 📜 License & Copyright
© 2026 **Sri Explainer** (`sriexplainer.in`). All Rights Reserved.
