# फल्सावदिया कृषि बाजार - PWA stable milestone configuration

यह दस्तावेज़ **फल्सावदिया कृषि बाजार** के **पूर्ण प्रोग्रेसिव वेब ऐप (PWA)** और **WebAPK** इंस्टॉलेशन सेटअप को स्थिर (Stable Milestone) रूप में सुरक्षित रखने के लिए बनाया गया है। 

यदि भविष्य में कोई बदलाव PWA को साधारण "Shortcut" (शॉर्टकट) में बदल देता है, तो इस दस्तावेज़ में दी गई सेटिंग्स और फ़ाइलों को देखकर उसे तुरंत सुधारा जा सकता है।

---

## 🎯 PWA और WebAPK वर्क करने के पीछे मुख्य कारण (Root Causes & Solutions)

पहले जब ऐप सिर्फ एक शॉर्टकट की तरह इंस्टॉल हो रहा था और क्रोम ब्राउज़र में वास्तविक इंस्टॉल बटन गायब हो रहा था, तो उसके पीछे निम्नलिखित मुख्य विसंगतियां थीं:

1. **`id` और `start_url` का बेमेल होना (Mismatch):**
   * **समस्या:** `id` को `/index.html` सेट किया गया था और `start_url` को `/` पर।
   * **समाधान:** WebAPK सुरक्षा नियमों के तहत, `id` और `start_url` दोनों को एक ही रूट पर आधारित होना आवश्यक है। हमने दोनों जगहों (`manifest.webmanifest` और `vite.config.ts`) में `id: "/"` सेट किया।

2. **Blob URL मैनिफ़ेस्ट जनरेशन की समस्या:**
   * **समस्या:** `PWAUpdater.tsx` बार-बार डायनामिक Blob URL बनाकर मैनिफ़ेस्ट लोड कर रहा था, जिससे क्रोम का स्टैटिक एनालिसिस टूट रहा था और ब्राउज़र इसे WebAPK के लिए अयोग्य मान रहा था।
   * **समाधान:** हमने `PWAUpdater` में डायनामिक Blob मैनिफेस्ट हटाकर स्टैटिक मैनिफेस्ट को ही सिंगल सोर्स ऑफ ट्रुथ बनाया और PWAUpdater को सिर्फ आइकॉन कैशिंग और एप्पल मेगा लिंक टैग्स तक सीमित रखा।

3. **Vercel Routing & Clean URL's:**
   * **समस्या:** Vercel पर Single Page Application के रूटिंग `(.*)` नियम के चलते `manifest.webmanifest` और static icons की रिक्वेस्ट्स रीराइट होकर `index.html` द्वारा हैंडल हो रही थीं जिससे क्रोम को मैनिफ़ेस्ट पार्सिंग एरर आ रहे थे।
   * **समाधान:** `vercel.json` में सभी PWA और सर्विस वर्कर एसेट्स हेतु डेस्टिनेशन रीराइट रुल को एक्सक्लूज़न में डाला गया।

---

## 📂 सुरक्षित कॉन्फ़िगरेशन फ़ाइलें (Configurations Backup)

### 1. `manifest.webmanifest` (रूट डायरेक्टरी)
```json
{
  "name": "फल्सावदिया कृषि बाजार",
  "short_name": "कृषि बाजार",
  "description": "मध्यप्रदेश के किसानों के लिए मंडी भाव, समाचार और योजनाओं की जानकारी",
  "start_url": "/",
  "id": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#F5F2ED",
  "theme_color": "#2D5A27",
  "orientation": "portrait",
  "dir": "ltr",
  "lang": "hi-IN",
  "categories": ["agriculture", "business", "news"],
  "prefer_related_applications": false,
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "बाजार",
      "url": "/products",
      "icons": [{ "src": "/icon-192.png", "sizes": "192x192" }]
    },
    {
      "name": "मंडी भाव",
      "url": "/mandi",
      "icons": [{ "src": "/icon-192.png", "sizes": "192x192" }]
    }
  ]
}
```

### 2. `vercel.json` (रूट डायरेक्टरी)
```json
{
  "rewrites": [
    {
      "source": "/icon-192.png",
      "destination": "/icon-192.png"
    },
    {
      "source": "/icon-512.png",
      "destination": "/icon-512.png"
    },
    {
      "source": "/manifest.webmanifest",
      "destination": "/manifest.webmanifest"
    },
    {
      "source": "/sw.js",
      "destination": "/sw.js"
    },
    {
      "source": "/workbox-:hash.js",
      "destination": "/workbox-:hash.js"
    },
    {
      "source": "/assets/:path*",
      "destination": "/assets/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3. `vite.config.ts` (PWA Plugin Entry)
```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: [],
  manifest: {
    name: 'फल्सावदिया कृषि बाजार',
    short_name: 'कृषि बाजार',
    description: 'मध्यप्रदेश के किसानों के लिए मंडी भाव, समाचार और योजनाओं की जानकारी',
    theme_color: '#2D5A27',
    background_color: '#F5F2ED',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'portrait',
    start_url: '/',
    scope: '/',
    id: '/',
    dir: 'ltr',
    lang: 'hi-IN',
    categories: ['agriculture', 'business', 'news'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    // Shortcuts and Workbox rules remain the same to ensure caching of Google fonts, general images and firebase queries.
  }
})
```

---

## 🛠️ रिकवरी और ऑडिट प्रक्रिया

यदि भविष्य में री-डिप्लॉयमेंट के दौरान कोई त्रुटि आती है या PWA का री-इंसटॉलेशन टूट जाता है, तो निम्नलिखित कदमों का पालन करें:

1. **Lighthouse Audit:**
   * Chrome DevTools खोलें → 'Lighthouse' टैब चुनें → 'PWA' चेकबॉक्स चालू करके 'Analyze page load' पर क्लिक करें।
   * यह आपको बतायेगा कि क्या सर्विस वर्कर ठीक से रजिस्टर हो रहा है और इंस्टॉलबिलिटी के मानदंड पूरे हो रहे हैं या नहीं।

2. **Service Worker Registry:**
   * Chrome DevTools → 'Application' टैब → 'Service Workers' पर जाकर चेक करें कि 'sw.js' क्रियाशील (Active and Running) है या नहीं।

3. **Vercel Routing bypass check:**
   * सीधे `{your-app-domain}/manifest.webmanifest` को ब्राउज़र एड्रेस बार में लोड करें। यदि यह पूरा JSON कंटेंट दिखता है (न कि `index.html`), तो Vercel रूट बाईपास सही काम कर रहा है।

यह माइलस्टोन पूरी तरह प्रमाणित है और भविष्य के सुरक्षित एक्सटेंशन के लिए सबसे बेहतरीन आधार है।
