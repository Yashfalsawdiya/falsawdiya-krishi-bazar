# Falsawdiya Krishi Bazaar - Project Architecture & Persistent Rules

## 1. Core Caching System (Strictly Preserved - 10 Lakh Farmers Architecture)
The application uses an **Offline-First IndexedDB + Metadata Versioning Caching Architecture** to support up to 1,000,000 (10 Lakh) active farmers with minimal or ZERO Firestore quota cost:

- **IndexedDB Storage**: Stored in database `falsawdiya_krishi_db` under key stores defined in `src/utils/dataSyncManager.ts`.
- **Metadata Versioning (`settings/metadata_version`)**:
  - Contains timestamps and version counters for `products`, `categories`, `appContent`, `deliveryConfig`, `heroBanners`, etc.
  - Normal users must **ONLY** read the lightweight `settings/metadata_version` document on launch. If the local version matches the remote version, products and categories **MUST** be loaded directly from local IndexedDB with zero (0) collection reads.
  - **12-Hour Version Check Throttling (`VERSION_CHECK_THROTTLE_MS = 12 * 60 * 60 * 1000`)**: Periodic checks are strictly throttled to 12 hours for regular users, reducing database reads by over 99.5% and keeping monthly bills at near ₹0 even at 10 lakh users.
- **Admin Mutation & Instant Force Push**:
  - Whenever an admin adds, edits, or deletes a product, category, banner, or setting, the code **MUST** update IndexedDB locally AND call `bumpMetadataVersion(db, collectionKey)`.
  - **Live Force Push Updates Button ("⚡ तुरंत अपडेट पुश करें")**: Located in Admin Panel under Content settings. Calls `forcePushMetadataVersion(db)` to immediately flag a critical update so all client devices across India purge stale local cache and fetch fresh catalog data on their next app open or swipe refresh without waiting for 12 hours.
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

## 4. Professional Icon System Standard (NO EMOJIS IN UI)
- **STRICT DEVELOPMENT STANDARD: NO EMOJIS IN UI — USE PROFESSIONAL ICONS ONLY.**
- All UI elements across the application (Pages, Header, Footer, Mobile Bottom Navigation, Side Menu, Admin Panel, POS, Bills/Invoices, Customer Ledger, Mandi Bhav, Agri News, Sarkari Yojnaaye, AI modules, Modals, Buttons, Cards, Badges, Empty/Error/Loading states, Notifications/Toasts) MUST use professional vector icons from `lucide-react`.
- Emojis are strictly forbidden in UI design, tab labels, headers, and buttons.
- Maintain consistent stroke-width, semantic icon selection, brand color harmonization, and proper spacing (flex items-center gap-1.5).
- User-generated content / custom user-entered product names are not altered, but all application UI elements must strictly adhere to professional icons.

## 5. Strict AI Model Stability & Immutable Feature Standard (Permanent Rule)
To prevent unexpected disruptions, 503 high-demand errors, or breaking changes in the future, the following standards are permanently locked:

- **Locked Standard Models**:
  - **Text, Vision, Analysis, Schemes & Knowledge Base**:
    - **Primary Model**: `gemini-3.6-flash` (production-grade stability, high rate-limit resilience, multi-modal vision support).
    - **Automatic Resilient Fallback**: `gemini-3.5-flash` (failover in case of upstream network or regional congestion).
  - **Live AI Voice Call**:
    - Strictly uses `gemini-3.1-flash-live-preview` via bidirectional WebSocket connection (`wss://generativelanguage.googleapis.com/...`).
- **Zero Random Model Switching**:
  - Developers and AI agents are strictly forbidden from altering, experimenting with, or downgrading model names to unverified previews (`gemini-3-flash-preview` or legacy models) that trigger 503 errors or quota crashes.
- **Strict `useAiGuard` Enforcement**:
  - Every AI feature must strictly enforce the user's personal Gemini API key via `useAiGuard.ts`. Never bypass, delete, or hardcode central API keys in frontend features.
- **Client-Side Direct Connection (Zero Firestore Cost)**:
  - All AI operations are strictly client-to-Google direct calls. Never write or log user AI queries, scans, or voice transcripts to Firestore collections, preserving the 10 Lakh users ₹0 cost architecture.
- **Farmer-Friendly Hindi Prompts**:
  - Prompt instructions for crop disease diagnosis, dosage prescriptions, mandi advisory, and schemes must maintain empathetic, respectful, and crystal-clear Hindi terminology suitable for Indian farmers.


