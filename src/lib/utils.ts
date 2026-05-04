import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export async function compressImage(base64: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Clear canvas to ensure transparency is preserved
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Use webp if possible as it supports transparency and compression
      // Fallback to png if input was png to preserve transparency, else jpeg
      const isPng = base64.startsWith('data:image/png');
      const format = isPng ? 'image/png' : 'image/jpeg';
      
      // Try webp first for best results with transparency
      try {
        const webp = canvas.toDataURL('image/webp', quality);
        if (webp.startsWith('data:image/webp')) {
          resolve(webp);
          return;
        }
      } catch (e) {
        // Fallback
      }
      
      resolve(canvas.toDataURL(format, isPng ? undefined : quality));
    };
    img.onerror = error => reject(error);
  });
}
