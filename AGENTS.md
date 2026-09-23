# Falsawdiya Krishi Bazaar - Project Architecture & Persistent Rules

## 1. Core Caching System (Strictly Preserved)
The application uses an **Offline-First IndexedDB + Metadata Versioning Caching Architecture** to support 50,000–100,000+ active users within Firestore free/minimal quotas. Any future updates MUST preserve and maintain this system:

- **IndexedDB Storage**: Stored in database `falsawdiya_krishi_db` under key stores defined in `src/utils/dataSyncManager.ts`.
- **Metadata Versioning (`_metadata/versions`)**:
  - Contains timestamps and version counters for `products`, `categories`, `appContent`, `deliveryConfig`, `heroBanners`, etc.
  - Normal users must **ONLY** read the lightweight `_metadata/versions` document on launch. If the local version matches the remote version, products and categories **MUST** be loaded directly from local IndexedDB with zero (0) collection reads.
  - Periodic checks are throttled (minimum 15 minutes) to prevent redundant reads on re-renders or page navigation.
- **Admin Mutation Rule**:
  - Whenever an admin adds, edits, or deletes a product, category, banner, or setting, the code **MUST** update IndexedDB locally AND call `bumpMetadataVersion(db, collectionKey)`. This notifies all client devices to fetch fresh data on their next scheduled check.
- **Never Revert to Direct Full Reads**: Never add direct `onSnapshot` listeners to the entire `products` collection for regular users.

## 2. Decoupled AI Architecture (Zero Firestore Impact)
All AI features are strictly client-to-Gemini direct connections:
- **User-Specific API Key**: All AI features (AI Voice Call, Disease Scan, Product Knowledge, Mandi Bhav, Agri News, Schemes, Weather Advice) require the user's own Gemini API Key (`useAiGuard.ts`).
- **Zero Firestore Read/Write on AI Calls**: AI queries must never trigger Firestore collection reads or writes. AI responses are either transient or cached locally in `localStorage`/IndexedDB.
- **Google Search Grounding & WebSockets**:
  - Mandi Bhav and Agri News use Google Search Grounding with 24-hour local caching.
  - AI Voice Call connects directly via WebSockets to the Gemini Live API (`gemini-3.1-flash-live-preview`).

## 3. Security Rules & Admin Access
- `firestore.rules` grants public read access to `_metadata/versions` while restricting write operations to verified admin emails (`yashfalsawdiya36@gmail.com`).
- Always run `compile_applet` and `lint_applet` after making any code adjustments.
