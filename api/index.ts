import app from '../server/app.js';

export default function handler(req: any, res: any) {
  // Fix for Vercel URL rewrite:
  // When vercel.json rewrites /api/:match* to /api/index, req.url may become /api/index?...
  // Reconstruct the true original API route from headers or query param so Express routes match.
  const matchedPath = req.headers?.['x-matched-path'] as string | undefined;
  if (matchedPath && matchedPath.startsWith('/api/') && !matchedPath.startsWith('/api/index')) {
    const queryPart = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = matchedPath + queryPart;
  } else if (req.url && req.url.startsWith('/api/index')) {
    const match = req.query?.match;
    if (typeof match === 'string' && match) {
      const remainingUrl = req.url.replace(/^\/api\/index\??/, '');
      const cleanQuery = remainingUrl.replace(/match=[^&]*&?/, '').replace(/&$/, '');
      req.url = `/api/${match}${cleanQuery ? `?${cleanQuery}` : ''}`;
    }
  }

  return app(req, res);
}

