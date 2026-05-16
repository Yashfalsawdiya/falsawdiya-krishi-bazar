import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ImageSource } from "../types";

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

export async function compressImage(base64: string, maxWidth = 600, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Smart compression for Low-size Preview (Optimized)
      // Default to 600px for previews to ensure fast loading and low storage quota
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

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      const isPng = base64.startsWith('data:image/png');
      const format = isPng ? 'image/png' : 'image/jpeg';
      
      try {
        const webp = canvas.toDataURL('image/webp', quality);
        if (webp.startsWith('data:image/webp')) {
          // If webp is drastically smaller/larger, we could check here
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
export function getHighResImageURL(image: string | ImageSource | undefined): string {
  if (!image) return '';
  
  if (typeof image === 'string') {
    return getDirectImageURL(image);
  }

  // PRORITIZE FALLBACK (URL) for High Resolution view as requested
  if (image.fallback) {
    return getDirectImageURL(image.fallback);
  }

  // Return primary if no fallback URL exists
  return getDirectImageURL(image.primary);
}
