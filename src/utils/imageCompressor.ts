/**
 * Image Compression Utility
 * Resizes and compresses image files using HTML5 Canvas
 * Ensures image payloads are lightweight, fast to transmit, and fit well within Gemini API limits.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: string;
}

export async function compressImageFile(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.82,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        return reject(new Error('Failed to read file as Data URL'));
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio preserving dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original dataUrl if canvas context is unavailable
          return resolve(dataUrl);
        }

        // Draw and compress to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Canvas toDataURL failed, using original:', err);
          resolve(dataUrl);
        }
      };

      img.onerror = (err) => {
        console.warn('Image load error during compression, using raw data:', err);
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function compressMultipleImageFiles(
  files: (File | Blob)[],
  options?: CompressionOptions
): Promise<string[]> {
  const promises = files.map((file) => compressImageFile(file, options));
  return Promise.all(promises);
}
