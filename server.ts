import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import { Jimp } from 'jimp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Config
let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    // Fallback to env vars for production
    firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
      databaseId: process.env.VITE_FIREBASE_DATABASE_ID
    };
  }
} catch (e) {
  console.error("Failed to load firebase config on server:", e);
}

// Initializing Firebase safely
let firebaseApp: any = null;
let db: any = null;
let dbId = '(default)';

try {
  const hasConfig = firebaseConfig && firebaseConfig.projectId;
  if (hasConfig) {
    firebaseApp = initializeApp(firebaseConfig);
    dbId = firebaseConfig.firestoreDatabaseId || (firebaseConfig.databaseId && firebaseConfig.databaseId !== "" ? firebaseConfig.databaseId : '(default)');
    db = getFirestore(firebaseApp, dbId);
  }
} catch (e) {
  console.error("Firebase initialization failed on server:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      firebase: !!firebaseApp,
      mode: process.env.NODE_ENV,
      dbId: dbId
    });
  });

  // Cache for processed icons
  const iconCache = new Map<string, Buffer>();

  // Helper to fetch branding
  const getBranding = async () => {
    if (!db) return null;
    try {
      const snap = await getDoc(doc(db, 'settings', 'content'));
      if (snap.exists()) {
        return snap.data().branding;
      }
    } catch (e) {
      console.error("Error fetching branding for manifest:", e);
    }
    return null;
  };

  // 1. Dynamic Manifest Route
  app.get('/manifest.json', async (req, res) => {
    try {
      const branding = await getBranding();
      const name = branding?.name || 'फल्सावदिया कृषि बाज़ार';
      const shortName = branding?.shortName || 'कृषि बाज़ार';
      
      const manifest = {
        id: 'com.krishibazaar.app.falsawdiya.v1',
        name: name,
        short_name: shortName,
        description: branding?.tagline || 'मध्यप्रदेश के किसानों के लिए मंडी भाव, समाचार और योजनाओं की जानकारी',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#2D5A27',
        orientation: 'portrait',
        dir: 'ltr',
        lang: 'hi-IN',
        categories: ['agriculture', 'business', 'news', 'shopping'],
        prefer_related_applications: false,
        icons: [
          {
            src: '/api/icon?purpose=any&size=512',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/api/icon?purpose=maskable&size=512',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/api/icon?purpose=any&size=192',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/api/icon?purpose=maskable&size=192',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'मंडी भाव',
            url: '/mandi',
            icons: [{ src: '/api/icon?purpose=any&size=192', sizes: '192x192' }]
          },
          {
            name: 'उत्पाद',
            url: '/products',
            icons: [{ src: '/api/icon?purpose=any&size=192', sizes: '192x192' }]
          }
        ]
      };

      res.json(manifest);
    } catch (e) {
      console.error("Error generating manifest:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 2. Dynamic Icon Route with Processing
  app.get('/api/icon', async (req, res) => {
    const purpose = req.query.purpose === 'maskable' ? 'maskable' : 'any';
    const size = parseInt(req.query.size as string) || 512;
    const cacheKey = `${purpose}-${size}`;

    if (iconCache.has(cacheKey)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(iconCache.get(cacheKey));
    }

    try {
      const branding = await getBranding();
      let iconUrl = '/icon-512.png'; // Fallback
      
      const pwaIcon = branding?.pwaIcon;
      if (pwaIcon) {
        iconUrl = typeof pwaIcon === 'string' ? pwaIcon : (pwaIcon.primary || pwaIcon.fallback || iconUrl);
      }

      // If it's a local path, read from disk
      let image: any;
      if (iconUrl.startsWith('http')) {
        image = await Jimp.read(iconUrl);
      } else {
        const localPath = path.join(process.cwd(), 'public', iconUrl.startsWith('/') ? iconUrl.substring(1) : iconUrl);
        if (fs.existsSync(localPath)) {
          image = await Jimp.read(localPath);
        } else {
          // Absolute fallback
          image = new Jimp({ width: size, height: size, color: 0xFFFFFFFF });
        }
      }

      // Resize and process
      await image.resize({ width: size, height: size });

      if (purpose === 'maskable') {
        // Create a larger canvas for white padding
        const padding = Math.floor(size * 0.2); // 20% padding
        const innerSize = size - (padding * 2);
        
        const background = await new Jimp({ width: size, height: size, color: 0xFFFFFFFF }); // White background
        await image.resize({ width: innerSize, height: innerSize });
        await background.composite(image, padding, padding);
        image = background;
      } else {
        // Subtle padding for 'any' to ensure it's not touching edges
        const padding = Math.floor(size * 0.05); 
        const innerSize = size - (padding * 2);
        const background = await new Jimp({ width: size, height: size, color: 0xFFFFFFFF });
        await image.resize({ width: innerSize, height: innerSize });
        await background.composite(image, padding, padding);
        image = background;
      }

      const buffer = await image.getBuffer('image/png');
      iconCache.set(cacheKey, buffer);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch (e) {
      console.error("Error generating icon:", e);
      res.status(500).send("Error generating icon");
    }
  });

  // 3. Vite Middleware for Development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
  process.exit(1);
});
