"use client";

const MAX_IMAGE_DIMENSION = 1280;
const TARGET_IMAGE_SIZE_BYTES = 650 * 1024;
const JPEG_QUALITIES = [0.72, 0.62, 0.52, 0.42];

export async function compressImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const image = await loadImage(file);
  const { width, height } = fitDimensions(
    image.naturalWidth,
    image.naturalHeight,
    MAX_IMAGE_DIMENSION,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, width, height);

  for (const quality of JPEG_QUALITIES) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size <= TARGET_IMAGE_SIZE_BYTES || quality === JPEG_QUALITIES.at(-1)) {
      return new File([blob], buildCompressedFileName(file.name), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }
  }

  return file;
}

function fitDimensions(width: number, height: number, maxDimension: number) {
  const largest = Math.max(width, height);

  if (largest <= maxDimension) {
    return { width, height };
  }

  const ratio = maxDimension / largest;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No fue posible leer la imagen seleccionada."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No fue posible comprimir la imagen."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function buildCompressedFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "") || "foto";
  return `${baseName}-comprimida.jpg`;
}
