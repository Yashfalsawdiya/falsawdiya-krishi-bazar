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

## 6. Centralized Hub & Incremental Auto-Merge Architecture (Permanent Immutable Rule)
To ensure seamless scalability for 1,000,000 (10 Lakh) farmers with zero quota crashes and zero monthly cost, the Centralized Public Utility Architecture is strictly locked:

- **Applicable Public Services**:
  - **Mandi Bhav** (`/api/mandi/prices`)
  - **Krishi Samachaar** (`/api/news/daily` & `/api/news/sync`)
  - **Sarkari Yojanae** (`/api/schemes/all` & `/api/schemes/sync`)
- **Zero API Key Requirement for Regular Farmers**:
  - Normal farmers must NEVER be blocked from viewing Mandi Bhav, reading Krishi Samachaar, or browsing Sarkari Yojanae.
  - All three public agricultural utilities load directly from the Centralized Server Hub and local cache (`localStorage`/IndexedDB) with zero (0) API key prompt and zero (0) cost to the farmer.
- **Zero-Firestore Impact & Shared Server Cache**:
  - Mandi Bhav, Krishi Samachaar, and Sarkari Yojanae do NOT consume Firestore read/write quota for regular user visits.
  - Krishi Samachaar fetches live authentic news from free, public Google News RSS feeds (Hindi) and stores them in `data/agri-news-cache.json`.
  - Mandi Bhav loads from public government Agmarknet / MandiPulse web feeds + cached in server memory.
  - Sarkari Yojanae maintains a permanent verified library of 20+ Central & State (MP) schemes in `data/agri-schemes-cache.json`.
- **Incremental Auto-Merge (Strict Non-Destructive Preservation)**:
  - Daily searches or syncs must NEVER wipe out, overwrite, or lose existing verified schemes or articles.
  - Newly announced schemes or subsidies are intelligently merged and added to the top with an `isNew: true` badge.
  - If no new schemes are announced on a day, all existing verified schemes remain 100% preserved and visible to all users.
  - When an existing scheme is updated with fresh subsidy percentages or links, it is enriched without creating duplicate entries.
- **Strict Immutability & Admin-Only Modification Authority**:
  - **LOCKED STANDARD**: Developers and AI agents are strictly forbidden from disabling the Centralized Hubs, reintroducing blocking API key modals for viewing, switching models, or altering this architecture unless EXPLICITLY ordered by the Admin (`yashfalsawdiya36@gmail.com`).

## 7. Strict Restored Baseline & Zero-Regression Code Protection (Permanent Lock)
- **Active Restored Baseline**:
  - The codebase snapshot restored from version **"Sep 26 - Admin Panel Nitiyan Section"** (`v-baseline-sep26`) is the official immutable baseline.
  - All existing UI pages, layout components (`Header.tsx`, `Footer.tsx`, `BottomNav.tsx`, `Layout.tsx`), color schemes, Lucide icons, fonts, routes, POS/Accounting modules, and Admin panels in this restored version are LOCKED.
- **Zero Unsolicited Code/UI Modifications**:
  - AI agents and developers must **NEVER** modify, redesign, refactor, replace, or simplify existing UI pages, components, CSS styles, or navigation bars on application load or during unrelated feature requests.
  - Do NOT touch or rewrite functioning UI components unless the user's prompt explicitly asks for a change to that specific component.
- **Strict Incremental-Only Version Progression**:
  - When the admin requests a new feature or modification, all code changes **MUST** be built strictly on top of this restored baseline as a forward incremental step.
  - Never revert, overwrite, or delete existing features or restore points.
  - Every modification must be validated with `compile_applet` and `lint_applet` to guarantee zero build breakage or unintentional regressions.
- **Git Baseline Checkpoint & Audit**:
  - The repository maintains the tag `v-baseline-sep26`.
  - Every new change must form a clean incremental commit so that any regression can be instantly diffed and verified against the restored baseline.

## 8. Strict Product Image Presentation & Card Consistency Standard (Permanent Rule)
To ensure a premium, uniform, and trustworthy visual experience for all farmers, the product image presentation and card visual standards are strictly locked across the entire application:

- **Unified Card Layout Standard**:
  - Product images across all listing surfaces (**Featured Products** on Home, **Krishi Bazaar** `/products`, Search Results, Category Views, Recommendation sections, and Modals) must strictly share the identical professional aspect ratio, clean white backdrop, and border styling.
- **Strict Image Container Specifications**:
  - **Full Square Container**: Image containers must always use `relative aspect-square w-full overflow-hidden border-b border-gray-100 cursor-zoom-in bg-white`.
  - **Zero Unsolicited Padding (`NO p-3 / p-2 / p-4`)**: Product images must never be placed inside padded boxes or inner margins that squeeze the image or make it look like an unprofessional thumbnail enclosed in an arbitrary box.
  - **Clean White Backdrop Only (`bg-white`)**: The background behind product images must always be crisp pure white (`bg-white`). Off-white, yellowish, or beige backdrops (such as `bg-[#FAF8F5]`) are strictly forbidden as they degrade visual clarity and make images look dated.
  - **Image Sizing & Fit**: `SmartImage` must fill the container seamlessly (`w-full h-full`, `objectFit="cover"`), with interactive zoom hover (`transition-transform duration-300 group-hover:scale-105`), subtle quick-zoom trigger (`Maximize2`), and clean out-of-stock overlay badge.
- **Card Wrapper Uniformity**:
  - Card containers in both `FeaturedProductCard.tsx` and `KrishiBazaarProductCard.tsx` must maintain matching rounded corners (`rounded-2xl`), border styling (`border border-gray-200/80`), subtle elevations (`shadow-sm hover:shadow-md transition-shadow duration-200`), and uniform grid heights (`h-full`).
- **Strict Immutability & Admin-Only Modification Authority**:
  - **LOCKED STANDARD**: Developers and AI agents are strictly forbidden from altering, experimenting with, refactoring, adding extra borders/paddings, or downgrading product image containers or card layouts across `KrishiBazaarProductCard.tsx`, `FeaturedProductCard.tsx`, and any product display components unless EXPLICITLY ordered by the Admin (`yashfalsawdiya36@gmail.com`).
