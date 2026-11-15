import html2canvas from 'html2canvas-pro';

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timerId: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timerId = window.setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
    }
  }
}

async function waitForContainerImages(
  container: HTMLElement,
  timeoutMs: number = 2500
): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return;

  await withTimeout(
    Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          })
      )
    ),
    timeoutMs,
    'Image preload timeout'
  ).catch(() => {
    // Proceed even if a decorative image timed out
  });
}

async function waitForDocumentFonts(timeoutMs: number = 1500): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.ready) return;
  await withTimeout(document.fonts.ready, timeoutMs, 'Font ready timeout').catch(() => {
    // Proceed using cached/system Devanagari fallback fonts
  });
}

/**
 * Composites a source canvas onto a fresh opaque white software 2D canvas.
 * Prevents transparent/unpainted canvas regions from turning solid BLACK when exported as JPEG.
 */
export function flattenCanvasToWhite(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  if (!width || !height) {
    throw new Error('कैनवास का आकार शून्य (0) प्राप्त हुआ।');
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;

  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('2D कैनवास कॉन्टेक्स्ट तैयार नहीं हो सका।');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(sourceCanvas, 0, 0);
  return outCanvas;
}

/**
 * Samples a grid across the flattened canvas to guarantee it is neither all-black nor blank white.
 */
export function validateCanvasHasVisibleContent(canvas: HTMLCanvasElement): {
  valid: boolean;
  reason?: string;
} {
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
    return { valid: false, reason: 'रसीद कैनवास खाली (0px) है।' };
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { valid: true };
  }

  const cols = 20;
  const rows = 24;
  let hasNonWhitePixel = false;
  let hasNonBlackPixel = false;

  for (let r = 0; r < rows; r++) {
    const y = Math.min(
      canvas.height - 1,
      Math.max(0, Math.floor(((r + 0.5) / rows) * canvas.height))
    );
    for (let c = 0; c < cols; c++) {
      const x = Math.min(
        canvas.width - 1,
        Math.max(0, Math.floor(((c + 0.5) / cols) * canvas.width))
      );
      const data = ctx.getImageData(x, y, 1, 1).data;
      const red = data[0];
      const green = data[1];
      const blue = data[2];
      const alpha = data[3];

      if (alpha > 10 && (red < 245 || green < 245 || blue < 245)) {
        hasNonWhitePixel = true;
      }
      if (alpha > 10 && (red > 15 || green > 15 || blue > 15)) {
        hasNonBlackPixel = true;
      }
      if (hasNonWhitePixel && hasNonBlackPixel) {
        return { valid: true };
      }
    }
  }

  if (!hasNonBlackPixel) {
    return { valid: false, reason: 'कैनवास पूरा काला (Black) रेंडर हुआ है।' };
  }
  if (!hasNonWhitePixel) {
    return { valid: false, reason: 'कैनवास पूरा खाली (Blank) रेंडर हुआ है।' };
  }
  return { valid: true };
}

export interface RenderHtmlCanvasOptions {
  html: string;
  width?: number;
  scale?: number;
  timeoutMs?: number;
}

async function renderOnce(
  html: string,
  width: number,
  scale: number,
  timeoutMs: number
): Promise<HTMLCanvasElement> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0px';
  host.style.width = `${width}px`;
  host.style.minWidth = `${width}px`;
  host.style.maxWidth = `${width}px`;
  host.style.backgroundColor = '#ffffff';
  host.style.color = '#111827';
  host.style.fontFamily =
    "'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
  host.style.letterSpacing = 'normal';
  host.style.wordSpacing = 'normal';
  host.style.margin = '0';
  host.style.padding = '0';
  host.style.boxSizing = 'border-box';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  host.style.opacity = '1';
  host.style.visibility = 'visible';
  host.innerHTML = html;

  document.body.appendChild(host);

  try {
    await Promise.all([
      waitForDocumentFonts(1500),
      waitForContainerImages(host, 2500),
    ]);

    // Give browser one paint frame to compute layout & text metrics
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => window.setTimeout(resolve, 40));
      } else {
        window.setTimeout(resolve, 60);
      }
    });

    const targetHeight = Math.max(host.scrollHeight, host.offsetHeight, 100);

    const rawCanvas = await withTimeout(
      html2canvas(host, {
        scale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        width,
        height: targetHeight,
        windowWidth: width,
        windowHeight: targetHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc, clonedElement) => {
          // Strip host Tailwind v4 stylesheets so receipt inline styles render fast & cleanly
          const hostStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          hostStyles.forEach((node) => {
            node.remove();
          });

          const cleanStyle = clonedDoc.createElement('style');
          cleanStyle.textContent = `
            * { box-sizing: border-box; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              color: #111827 !important;
              font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
              letter-spacing: normal !important;
              word-spacing: normal !important;
              visibility: visible !important;
              opacity: 1 !important;
            }
            table { border-collapse: collapse; }
          `;
          clonedDoc.head?.appendChild(cleanStyle);

          if (clonedElement) {
            clonedElement.style.position = 'static';
            clonedElement.style.left = '0px';
            clonedElement.style.top = '0px';
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.opacity = '1';
            clonedElement.style.backgroundColor = '#ffffff';
          }
        },
      }),
      timeoutMs,
      'रसीद तैयार करने में अधिक समय लग रहा है। कृपया पुनः प्रयास करें।'
    );

    const safeCanvas = flattenCanvasToWhite(rawCanvas);
    const check = validateCanvasHasVisibleContent(safeCanvas);
    if (!check.valid) {
      throw new Error(check.reason || 'रसीद ठीक से रेंडर नहीं हो सकी।');
    }

    return safeCanvas;
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

/**
 * Safely renders self-contained receipt HTML directly via an offscreen DIV (avoiding nested hidden iframes
 * that stall or paint black on Android PWA/WebView), flattens to opaque white, validates non-blank output,
 * and retries once at a lighter 1.5x scale if the device struggles at 2x.
 */
export async function renderHtmlToSafeCanvas(
  options: RenderHtmlCanvasOptions
): Promise<HTMLCanvasElement> {
  const width = options.width ?? 794;
  const primaryScale = options.scale ?? 2;
  const timeoutMs = options.timeoutMs ?? 8500;

  try {
    return await renderOnce(options.html, width, primaryScale, timeoutMs);
  } catch (firstErr) {
    console.warn('Primary 2x receipt render failed, retrying at 1.5x:', firstErr);
    return await renderOnce(options.html, width, 1.5, timeoutMs);
  }
}
