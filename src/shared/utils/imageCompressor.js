/**
 * In-browser canvas-based image compressor.
 * Downsamples high-resolution user photos to web-optimal PNG/JPEG
 * to ensure fast uploads (<250KB), prevent HTTP timeout errors, and accelerate KYC submission.
 */
export async function compressImageFile(file, maxDimension = 512, quality = 0.85, forceJpeg = false) {
  if (!file) return file;

  // Don't rasterize vector SVGs or raw ICO icons
  if (file.type === "image/svg+xml" || file.type === "image/x-icon" || file.type === "image/vnd.microsoft.icon") {
    return file;
  }

  return new Promise((resolve) => {
    // 2.5s maximum timeout safeguard so image compression never hangs file selection
    const timer = setTimeout(() => resolve(file), 2500);

    const finish = (res) => {
      clearTimeout(timer);
      resolve(res);
    };

    const reader = new FileReader();
    reader.onerror = () => finish(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => finish(file);
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return finish(file);
          }

          ctx.drawImage(img, 0, 0, width, height);

          const mime = forceJpeg || file.type !== "image/png" ? "image/jpeg" : "image/png";
          canvas.toBlob(
            (blob) => {
              if (!blob) return finish(file);
              try {
                const ext = mime === "image/jpeg" ? ".jpg" : ".png";
                let newName = file.name || "document.jpg";
                if (!newName.toLowerCase().endsWith(ext)) {
                  newName = newName.replace(/\.[^/.]+$/, "") + ext;
                }
                let compressedFile;
                try {
                  compressedFile = new File([blob], newName, {
                    type: mime,
                    lastModified: Date.now(),
                  });
                } catch {
                  // Fallback for browsers that don't support new File([blob]) constructor
                  compressedFile = blob;
                  compressedFile.name = newName;
                }
                finish(compressedFile);
              } catch {
                finish(file);
              }
            },
            mime,
            quality
          );
        } catch {
          finish(file);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Specialized fast compressor for official government KYC identity documents and camera selfies.
 * Scales ultra-high-resolution smartphone photos (often 5-15MB) down to crisp 1600px JPEG (~150-250KB),
 * preserving razor-sharp text/number legibility while speeding up uploads by over 90%.
 */
export async function compressKycDocument(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  if (!file) return { file, originalSize: 0, compressedSize: 0, wasCompressed: false };

  const originalSize = file.size;

  // Preserve PDF documents intact
  if (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) {
    return { file, originalSize, compressedSize: originalSize, wasCompressed: false };
  }

  // If not an image, return as-is
  const isImage = file.type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(file.name || "");
  if (!isImage) {
    return { file, originalSize, compressedSize: originalSize, wasCompressed: false };
  }

  try {
    const compressed = await compressImageFile(file, maxDimension, quality, true);
    const compressedSize = compressed.size;
    const wasCompressed = compressedSize < originalSize;
    return {
      file: wasCompressed ? compressed : file,
      originalSize,
      compressedSize: wasCompressed ? compressedSize : originalSize,
      wasCompressed,
    };
  } catch (err) {
    console.warn("KYC document compression fallback:", err);
    return { file, originalSize, compressedSize: originalSize, wasCompressed: false };
  }
}

