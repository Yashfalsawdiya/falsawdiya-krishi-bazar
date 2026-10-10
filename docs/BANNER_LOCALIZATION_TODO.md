# Banner Localization Action Plan & Asset Checklist

## Overview
To provide a clean, Flipkart / Myntra grade bilingual experience (English & Hindi), banners that contain embedded Hindi typography within graphic image layers must support a bilingual schema:
```json
{
  "id": "banner-id",
  "title": {
    "en": "Organic Fertilizer Making Guide",
    "hi": "जैविक खाद बनाने की विधि"
  },
  "image": {
    "en": "https://example.com/banners/en/organic_fertilizer.webp",
    "hi": "https://example.com/banners/hi/organic_fertilizer.webp"
  }
}
```

The application now supports `getLocalizedImage(banner.image, currentLang)` across all hero carousels and device-specific banners (`deviceBanners.ts`). When an English image asset is provided, it is automatically displayed when English is selected, falling back gracefully to the primary image if the specific language asset is pending.

---

## Banners Requiring English Asset Replacements

| Banner ID | Current Embedded Hindi Text | Target English Wording | Recommended Visual Composition | Status |
| :--- | :--- | :--- | :--- | :--- |
| `mob-1` / `tab-1` | **खाद और बीज पर भारी छूट!** (सीमित समय के लिए ऑफर) | **Mega Discount on Fertilizers & Seeds!** (Limited Time Farm Offer) | Clean agrochemical bottles, seed bags with bold green & gold discount tag | Pending Graphic Asset |
| `mob-2` / `tab-2` | **नई किस्म के सोयाबीन बीज** (अधिक पैदावार की गारंटी) | **High-Yield Certified Soybean Seeds** (Guaranteed Germination) | Pod-laden lush soybean plant in field, certified seed tag | Pending Graphic Asset |
| `mob-3` | **फसल सुरक्षा समाधान** (बेहतरीन कीटनाशक उपलब्ध) | **Complete Crop Protection Solutions** (Top-Tier Insecticides & Fungicides) | Modern spray application in crop canopy, clean laboratory bottle | Pending Graphic Asset |
| `vid-organic` | **जैविक खाद बनाने की विधि** | **How to Make Organic Fertilizer** (Step-by-Step Farmer's Guide) | Compost pit, organic matter decomposing into rich black humus | Pending Graphic Asset |
| `vid-soil` | **मिट्टी परीक्षण कैसे करें** | **How to Do Soil Testing** (Step-by-Step Soil Sampling) | Farmer collecting soil sample with soil testing card | Pending Graphic Asset |
| `hero-store` | **फल्सावदिया कृषि बाजार - किसान का भरोसा** | **Falsawdiya Krishi Bazaar - Farmer's Trust** | Clean shopfront branding with green field background | Pending Graphic Asset |

---

## Implementation Details
1. **Dynamic Resolution**: `getLocalizedImage(banner.image, lang)` inspects if `banner.image` is a bilingual map `{ en: string, hi: string }` or a single URL string.
2. **Admin Panel Upload**: In Admin Banner settings, administrators can upload both Hindi and English banner files, or provide localized image URLs.
3. **Typography**: The text overlays rendered in DOM now use `i18n.t()` or `getLocalized()` instead of hardcoded strings, ensuring that even if an image does not have an English replacement yet, all surrounding titles, buttons, badges, and subtitles render in 100% natural English.
