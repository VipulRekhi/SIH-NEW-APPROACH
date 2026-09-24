import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_OCR_DIR = path.resolve(__dirname, '../../../storage/temp/ocr');

export class OcrPreprocessor {
  /**
   * Generates an enhanced working grayscale copy of the image optimized for OCR.
   * Original image is never modified.
   */
  static async prepareEnhancedImage(originalPath: string): Promise<{
    enhancedPath: string;
    width: number;
    height: number;
  }> {
    const parsed = path.parse(originalPath);
    const enhancedPath = path.join(TEMP_OCR_DIR, `${parsed.name}_enhanced.png`);

    const image = sharp(originalPath);
    const metadata = await image.metadata();
    const origWidth = metadata.width || 1200;
    const origHeight = metadata.height || 800;

    // Target width: upscale if resolution is low, or downscale if excessively huge
    let targetWidth = origWidth;
    if (origWidth < 1600) {
      targetWidth = Math.min(2400, Math.round(origWidth * 1.5));
    }

    await image
      .resize({ width: targetWidth, withoutEnlargement: false })
      .grayscale()
      .normalize() // Stretch contrast across full dynamic range
      .sharpen({ sigma: 1.2, m1: 1.0, m2: 2.0 }) // Crisp text edges without ringing
      .png()
      .toFile(enhancedPath);

    const enhancedMeta = await sharp(enhancedPath).metadata();

    return {
      enhancedPath,
      width: enhancedMeta.width || targetWidth,
      height: enhancedMeta.height || origHeight
    };
  }

  /**
   * Crops a specific bounding box region from an image, upscales it,
   * enhances contrast, and saves it as a temporary field image for dedicated OCR.
   */
  static async cropFieldRegion(
    imagePath: string,
    region: { left: number; top: number; width: number; height: number },
    fieldTag: string
  ): Promise<string> {
    const parsed = path.parse(imagePath);
    const cropPath = path.join(TEMP_OCR_DIR, `${parsed.name}_crop_${fieldTag}.png`);

    const img = sharp(imagePath);
    const meta = await img.metadata();
    const imgWidth = meta.width || 2000;
    const imgHeight = meta.height || 1500;

    // Clamp coordinates safely inside image bounds
    const safeLeft = Math.max(0, Math.min(region.left, imgWidth - 10));
    const safeTop = Math.max(0, Math.min(region.top, imgHeight - 10));
    const safeWidth = Math.max(10, Math.min(region.width, imgWidth - safeLeft));
    const safeHeight = Math.max(10, Math.min(region.height, imgHeight - safeTop));

    await img
      .extract({ left: Math.round(safeLeft), top: Math.round(safeTop), width: Math.round(safeWidth), height: Math.round(safeHeight) })
      .resize({ width: Math.round(safeWidth * 2) }) // 2x upscale for small text/digits
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toFile(cropPath);

    return cropPath;
  }

  /**
   * Cleanup temporary processed variants
   */
  static cleanTempFiles(...filePaths: string[]) {
    for (const fp of filePaths) {
      if (fp && fs.existsSync(fp)) {
        try {
          fs.unlinkSync(fp);
        } catch (_) {}
      }
    }
  }
}
