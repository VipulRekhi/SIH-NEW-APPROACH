import { createWorker, PSM } from 'tesseract.js';
import path from 'path';
import sharp from 'sharp';
import { OcrParser } from './ocr.parser.js';
import { OcrPreprocessor } from './ocr.preprocessor.js';
import { OcrProcessingResult, ExtractedInstrumentData } from './ocr.types.js';

export class OcrService {
  /**
   * Two-stage OCR Pipeline:
   * 1. Preprocessing (Grayscale, dynamic range normalization, sharpening)
   * 2. Full Image Pass (Captures full layout, text blocks, and word coordinates)
   * 3. Field-Specific Targeted Cropping & OCR (Dedicated line-level OCR on difficult boxes)
   * 4. Multi-Pattern Normalization & Validation
   */
  static async processImage(filePath: string): Promise<OcrProcessingResult> {
    let worker: any = null;
    let enhancedPath = '';
    const tempCrops: string[] = [];

    try {
      console.log(`[OCR Pipeline] Starting processing for: ${path.basename(filePath)}`);

      // Stage 1: Image Preprocessing (preserving original file)
      const prep = await OcrPreprocessor.prepareEnhancedImage(filePath);
      enhancedPath = prep.enhancedPath;
      console.log(`[OCR Pipeline] Generated enhanced working copy: ${prep.width}x${prep.height}`);

      // Initialize local Tesseract.js worker
      worker = await createWorker('eng');

      // Stage 2: Full Image OCR Pass with layout blocks enabled
      const ret = await worker.recognize(enhancedPath, {}, { blocks: true });
      const fullRawText = ret.data.text || '';
      const baseConfidence = Math.round(ret.data.confidence || 75);

      console.log(`[OCR Pipeline] Full-image pass complete. Base confidence: ${baseConfidence}%`);

      // Initial field extraction from full text
      let { extracted, confidences } = OcrParser.parse(fullRawText, baseConfidence);

      // Collect detected words with coordinates for field-level cropping
      const detectedWords: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }> = [];
      for (const block of ret.data.blocks || []) {
        for (const paragraph of block.paragraphs || []) {
          for (const line of paragraph.lines || []) {
            for (const word of line.words || []) {
              detectedWords.push({
                text: word.text.trim(),
                bbox: word.bbox
              });
            }
          }
        }
      }

      // Stage 3: Field-Specific Targeted OCR for missing or uncertain fields
      // 3A. Dedicated Model Number Field OCR
      if (!extracted.model_number || /^(power|supply|operating|voltage|temp)$/i.test(extracted.model_number)) {
        const modelWord = detectedWords.find((w) => /^model$/i.test(w.text));
        if (modelWord) {
          try {
            console.log('[OCR Pipeline] Running targeted crop for Model Number...');
            // Box is immediately to the right of "Model"
            const cropPath = await OcrPreprocessor.cropFieldRegion(
              enhancedPath,
              {
                left: modelWord.bbox.x1 + 15,
                top: Math.max(0, modelWord.bbox.y0 - 20),
                width: 480,
                height: 70
              },
              'model'
            );
            tempCrops.push(cropPath);

            await worker.setParameters({ tessedit_pageseg_mode: '7' as any }); // Single text line
            const cropRet = await worker.recognize(cropPath);
            const cropText = cropRet.data.text.trim();
            console.log(`[OCR Pipeline] Model crop result: "${cropText}"`);

            const cleanModel = cropText.replace(/[^A-Za-z0-9\-]/g, '');
            if (cleanModel.length >= 2 && !/^(power|supply)$/i.test(cleanModel)) {
              extracted.model_number = cleanModel;
              confidences.model_number = 94;
            }
          } catch (e) {
            console.warn('[OCR Pipeline] Targeted model crop notice:', e);
          }
        }
      }

      // 3B. Dedicated Verification Interval 'e' Field OCR
      if (extracted.verification_scale_interval === null) {
        const eWord = detectedWords.find((w) => /^e$/i.test(w.text) || w.text.startsWith('e=') || w.text.startsWith('e:'));
        if (eWord) {
          try {
            console.log('[OCR Pipeline] Running targeted crop for interval e...');
            const cropPath = await OcrPreprocessor.cropFieldRegion(
              enhancedPath,
              {
                left: eWord.bbox.x1 + 10,
                top: Math.max(0, eWord.bbox.y0 - 15),
                width: 450,
                height: 70
              },
              'interval_e'
            );
            tempCrops.push(cropPath);

            await worker.setParameters({ tessedit_pageseg_mode: '6' as any }); // Uniform block of text
            const cropRet = await worker.recognize(cropPath);
            const cropText = cropRet.data.text.trim();
            console.log(`[OCR Pipeline] Interval e crop result: "${cropText}"`);

            const eMatch = cropText.match(/([0-9]+(?:[\.,][0-9]+)?)/);
            if (eMatch) {
              const val = parseFloat(eMatch[1].replace(',', '.'));
              if (!isNaN(val) && val > 0) {
                extracted.verification_scale_interval = val;
                confidences.verification_scale_interval = 94;
              }
            }
          } catch (e) {
            console.warn('[OCR Pipeline] Targeted e crop notice:', e);
          }
        }
      }

      // 3C. Dedicated Actual Scale Interval 'd' Field OCR
      if (extracted.scale_interval === null) {
        const dWord = detectedWords.find((w) => /^d$/i.test(w.text) || w.text.startsWith('d=') || w.text.startsWith('d:'));
        if (dWord) {
          try {
            console.log('[OCR Pipeline] Running targeted crop for interval d...');
            const cropPath = await OcrPreprocessor.cropFieldRegion(
              enhancedPath,
              {
                left: dWord.bbox.x1 + 10,
                top: Math.max(0, dWord.bbox.y0 - 15),
                width: 450,
                height: 70
              },
              'interval_d'
            );
            tempCrops.push(cropPath);

            await worker.setParameters({ tessedit_pageseg_mode: '6' as any });
            const cropRet = await worker.recognize(cropPath);
            const cropText = cropRet.data.text.trim();
            console.log(`[OCR Pipeline] Interval d crop result: "${cropText}"`);

            const dMatch = cropText.match(/([0-9]+(?:[\.,][0-9]+)?)/);
            if (dMatch) {
              const val = parseFloat(dMatch[1].replace(',', '.'));
              if (!isNaN(val) && val > 0) {
                extracted.scale_interval = val;
                confidences.scale_interval = 94;
              }
            }
          } catch (e) {
            console.warn('[OCR Pipeline] Targeted d crop notice:', e);
          }
        }
      }

      // Stage 4: Post-Processing & Normalization
      // If model number is still missing, fallback to model code in serial number (e.g., "ETPL/DS252/240781" -> "DS-252")
      if ((!extracted.model_number || /^(power|supply)$/i.test(extracted.model_number)) && extracted.serial_number) {
        const sub = extracted.serial_number.match(/\/([A-Za-z]{1,4}\d{2,4})\//);
        if (sub) {
          extracted.model_number = sub[1].replace(/^([A-Za-z]+)(\d+)$/, '$1-$2');
          confidences.model_number = 92;
        }
      }

      // If e is present but d is missing in Class III instruments, d usually equals e
      if (extracted.verification_scale_interval !== null && extracted.scale_interval === null) {
        extracted.scale_interval = extracted.verification_scale_interval;
        confidences.scale_interval = 85;
      }

      // Clean up temp images
      OcrPreprocessor.cleanTempFiles(enhancedPath, ...tempCrops);
      await worker.terminate();

      // Check completeness
      const isComplete =
        extracted.manufacturer !== null &&
        extracted.model_number !== null &&
        extracted.serial_number !== null &&
        extracted.max_capacity !== null;

      const ocr_status = isComplete ? 'COMPLETED' : 'REVIEW_REQUIRED';

      console.log('[OCR Pipeline] Final Structured Extraction:', JSON.stringify(extracted, null, 2));

      return {
        raw_text: fullRawText,
        extracted_data: extracted,
        confidence_data: confidences,
        ocr_status
      };
    } catch (err: any) {
      if (worker) {
        try {
          await worker.terminate();
        } catch (_) {}
      }
      if (enhancedPath) {
        OcrPreprocessor.cleanTempFiles(enhancedPath, ...tempCrops);
      }

      console.error('[OCR Pipeline Fatal Error]', err);

      return {
        raw_text: '',
        extracted_data: {
          manufacturer: null,
          model_number: null,
          serial_number: null,
          instrument_type: 'Non-Automatic Weighing Instrument',
          accuracy_class: 'III',
          max_capacity: null,
          min_capacity: null,
          scale_interval: null,
          verification_scale_interval: null,
          unit: 'kg'
        },
        confidence_data: {},
        ocr_status: 'FAILED',
        error_message: err.message || 'OCR processing failed.'
      };
    }
  }
}
