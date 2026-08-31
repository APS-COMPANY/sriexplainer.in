# 📱 Sri Explainer — Official Flutter Android Application

> **Package Name:** `in.sriexplainer.app`  
> **Target Platforms:** Android Phones, Tablets, Foldables (Android 5.0+ / API 21+)  
> **Backend Integration:** Connected to official production website [https://sriexplainer.in/api](https://sriexplainer.in/api)

---

## 🌟 Key Features

1. **🎬 Dark Cinematic Video Player Experience:**
   - Compliant embedded official Rumble iframe video player (`https://rumble.com/embed/...`).
   - Seamless Portrait & Fullscreen Landscape orientation toggling.
   - Auto-next episode countdown timer.
   - Timestamped comments and discussion section.

2. **👑 VIP Membership & Cashfree Payments:**
   - Real-time VIP verification directly against the production server.
   - 100% Ad-Free streaming, 4K resolution, and early episode access.

3. **🪙 XP Coins Economy & Pay-Per-Episode:**
   - XP wallet with balance and transaction ledger.
   - Instant episode unlocking bottom sheet modal (`POST /api/episodes/[id]/unlock`).

4. **📺 Full Catalog & Deep Linking:**
   - Home screen with auto-rotating Hero Banner, Continue Watching progress, Latest Episodes, Trending series, and Upcoming releases with live countdowns.
   - Searchable Explore catalog with multi-genre and status chips.
   - Bookmarking to My List & Watch History synchronization.
   - Android Deep Links for `https://sriexplainer.in/series/*` and `https://sriexplainer.in/watch/*`.

---

## 🏗️ Architecture & Project Structure

Clean Architecture with Riverpod and Feature-First separation:

```
flutter_app/
├── android/                   # Native Android manifests, Gradle, deep links & launcher icons
├── lib/
│   ├── core/                  # Infrastructure layer
│   │   ├── config/            # Base URLs, timeouts, storage keys
│   │   ├── network/           # Dio HTTP client, interceptors, error mapping
│   │   ├── storage/           # FlutterSecureStorage & SharedPreferences cache
│   │   ├── theme/             # Dark cinematic theme, colors, typography
│   │   ├── router/            # GoRouter with stateful shell navigation
│   │   └── widgets/           # Reusable badges, buttons, skeletons, countdowns
│   ├── models/                # Strongly typed data models
│   ├── features/              # Feature modules (UI, Providers, Repositories)
│   │   ├── auth/              # Login, register, session persistence
│   │   ├── home/              # Hero carousel, continue watching, feeds
│   │   ├── explore/           # Catalog search, genre & status filters
│   │   ├── series/            # Series details, episode list
│   │   ├── episode/           # Episode unlock modal
│   │   ├── player/            # Rumble video player & auto-next
│   │   ├── comments/          # Episode comments & replies
│   │   ├── vip/               # VIP membership & Cashfree flow
│   │   ├── xp_coins/          # XP wallet & top-up packages
│   │   ├── my_list/           # Saved series bookmarks
│   │   ├── history/           # Watch history & progress
│   │   └── profile/           # User dashboard & settings
│   └── main.dart              # App entry point
└── pubspec.yaml               # Dependencies & assets configuration
```

---

## 🛠️ Build & Run Commands

### 1. Install Dependencies:
```bash
cd flutter_app
flutter pub get
```

### 2. Run in Debug Mode:
```bash
flutter run
```

### 3. Build Production Release APK:
```bash
flutter build apk --release
```
The compiled APK will be located at:
`build/app/outputs/flutter-apk/app-release.apk`

### 4. Build Production Android App Bundle (AAB for Google Play):
```bash
flutter build appbundle --release
```
The compiled bundle will be located at:
`build/app/outputs/bundle/release/app-release.aab`

---

## 🔒 Security & Data Safety

- No secret private keys (e.g. `CASHFREE_SECRET_KEY`, database tokens) are stored in the client.
- All authorization, VIP status validation, and coin unlocking are confirmed strictly through the authoritative backend REST endpoints.
