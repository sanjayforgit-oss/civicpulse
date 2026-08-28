/**
 * CivicPulse Image Compression Utility
 * Resizes and compresses user photos on the client side before Base64 conversion
 * to guarantee document sizes remain well below Firestore's 1 MB limit (average output: 80 KB - 150 KB).
 */

export const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.65) => {
  return new Promise((resolve) => {
    if (!file || typeof file === 'string') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio bounds
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

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to compressed JPEG Data URL
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(event.target.result);
    };
    reader.onerror = () => resolve(file);
  });
};
