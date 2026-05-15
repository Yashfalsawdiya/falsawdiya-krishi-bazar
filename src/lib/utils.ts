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

export async function compressImage(base64: string, maxWidth = 2560, quality = 0.92): Promise<string> {
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

/**
 * Converts various link formats (like Google Drive) into direct image URLs
 */
export function getDirectImageURL(url: string | undefined): string {
  if (!url || typeof url !== 'string' || url.trim() === '') return '';
  
  const trimmedUrl = url.trim();
  
  // Google Drive conversion
  // Format 1: https://drive.google.com/file/d/FILE_ID/view
  // Format 2: https://drive.google.com/open?id=FILE_ID
  // Format 3: https://docs.google.com/file/d/FILE_ID/edit
  // Format 4: https://drive.google.com/uc?id=FILE_ID
  const googleDriveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/;
  const match = trimmedUrl.match(googleDriveRegex);
  
  if (match && match[1]) {
    const fileId = match[1];
    // Return high-quality direct link format
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return url;
}

/**
 * Returns a high-resolution version of an image URL by stripping common compression/resizing parameters
 * For Google Drive, the direct URL is already high-quality.
 */
export function getHighResImageURL(url: string | undefined): string {
  if (!url || typeof url !== 'string' || url.trim() === '') return '';
  return getDirectImageURL(url);
}
