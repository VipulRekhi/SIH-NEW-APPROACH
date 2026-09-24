import { ExtractedInstrumentData } from './ocr.types.js';

export class OcrParser {
  /**
   * Sanitizes and parses OCR text into structured metrological parameters.
   * Handles multi-column layouts, table formats, and field relationships.
   */
  static parse(rawText: string, baseConfidence = 80): {
    extracted: ExtractedInstrumentData;
    confidences: Record<string, number>;
  } {
    const fullText = rawText.replace(/\r/g, '');
    const lines = fullText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    let manufacturer: string | null = null;
    let model_number: string | null = null;
    let serial_number: string | null = null;
    let instrument_type: string | null = null;
    let accuracy_class: string | null = null;
    let max_capacity: number | null = null;
    let min_capacity: number | null = null;
    let scale_interval: number | null = null;
    let verification_scale_interval: number | null = null;
    let unit: string | null = null;

    const confidences: Record<string, number> = {};

    // 1. Detect Measurement Unit
    const unitMatch = fullText.match(/\b(kg|mg|g|t)\b/i);
    if (unitMatch) {
      unit = unitMatch[1].toLowerCase();
      confidences.unit = 95;
    } else {
      unit = 'kg';
      confidences.unit = 60;
    }

    // 2. Manufacturer Detection
    const manufacturerMap: Record<string, RegExp> = {
      'Essae': /\b(essae|essae\s+teraoka)\b/i,
      'Mettler Toledo': /\b(mettler\s*toledo)\b/i,
      'Avery Weigh-Tronix': /\b(avery|avery\s+weigh[- ]tronix)\b/i,
      'Sartorius': /\b(sartorius)\b/i,
      'Ohaus': /\b(ohaus)\b/i,
      'CAS': /\b(cas\s+corporation|cas\s+scale)\b/i,
      'Shimadzu': /\b(shimadzu)\b/i,
      'AND': /\b(a&d|a\s+and\s+d)\b/i,
      'ABC Weighing Systems': /\b(abc\s+weighing)\b/i
    };

    for (const [name, pattern] of Object.entries(manufacturerMap)) {
      if (pattern.test(fullText)) {
        manufacturer = name;
        confidences.manufacturer = 95;
        break;
      }
    }

    // 3. Serial Number Detection (High Priority)
    // Matches patterns like "Serial No. ETPL/DS252/240781", "S/N: MT-773921", "Serial: ABX93821"
    // CRITICAL: Must include '/' and '-' and must NOT truncate at letters
    const serialRegex = /(?:serial(?:\s*no\.?)?|s\/?n\.?|sr\.?\s*no\.?)\s*[:=\s\|\[]*([A-Za-z0-9\-_/]+)/i;
    const serialMatch = fullText.match(serialRegex);
    if (serialMatch && serialMatch[1]) {
      let candidate = serialMatch[1].trim();
      // Clean leading or trailing punctuation
      candidate = candidate.replace(/^[_\/\-]+|[_\/\-]+$/g, '');
      if (candidate.length >= 3) {
        serial_number = candidate;
        // Meaningful confidence check
        const hasDigits = /\d/.test(serial_number);
        const hasSlashOrHyphen = /[\/\-]/.test(serial_number);
        if (hasDigits && hasSlashOrHyphen) {
          confidences.serial_number = 96;
        } else if (hasDigits) {
          confidences.serial_number = 88;
        } else {
          // Only letters (e.g. "ETPL") -> clearly incomplete
          confidences.serial_number = 40;
        }
      }
    }

    // Secondary Serial fallback: look for barcode text or ETPLxxxx pattern
    if (!serial_number || confidences.serial_number < 50) {
      const barcodeMatch = fullText.match(/\b([A-Z]{3,4}\d{5,10})\b/);
      if (barcodeMatch) {
        serial_number = barcodeMatch[1];
        confidences.serial_number = 80;
      }
    }

    // 4. Model Number Detection
    // Blacklisted words that often appear near "Model" on nameplates (e.g., "Model Power Supply")
    const blacklistedModelWords = /^(power|supply|operating|voltage|temp|consumption|serial|accuracy|class|weighing)$/i;

    // Pattern A: Check line starting with "Model"
    for (const line of lines) {
      const lineModelMatch = line.match(/^\|?\s*model\s*[:=\s\|\[]*([A-Za-z0-9\-]+)/i);
      if (lineModelMatch && lineModelMatch[1]) {
        const val = lineModelMatch[1].trim();
        if (!blacklistedModelWords.test(val) && val.length >= 2) {
          model_number = val;
          confidences.model_number = 92;
          break;
        }
      }
    }

    // Pattern B: General model match if not found
    if (!model_number) {
      const modelRegex = /(?:model(?:\s*no\.?)?|mod\.|type)\s*[:=\s\|\[]*([A-Za-z0-9\-]+)/i;
      const mMatch = fullText.match(modelRegex);
      if (mMatch && mMatch[1]) {
        const val = mMatch[1].trim();
        if (!blacklistedModelWords.test(val) && val.length >= 2) {
          model_number = val;
          confidences.model_number = 88;
        }
      }
    }

    // Pattern C: Intelligent extraction from Serial Number (e.g., "ETPL/DS252/240781" -> "DS-252")
    if ((!model_number || blacklistedModelWords.test(model_number)) && serial_number) {
      const subModelMatch = serial_number.match(/\/([A-Za-z]{1,4}\d{2,4})\//);
      if (subModelMatch) {
        const rawPart = subModelMatch[1];
        // Insert hyphen if letters directly precede numbers, e.g., DS252 -> DS-252
        model_number = rawPart.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2');
        confidences.model_number = 94;
      }
    }

    // 5. Capacity Extraction: Weighing Range (e.g., "Weighing Range 0.2 kg ~ 30 kg")
    const rangeRegex = /(?:weighing\s*range|range)\s*[:=\s]*([0-9]+(?:[\.,][0-9]+)?)\s*(kg|g|mg|t)?\s*[~–\-\/to]+\s*([0-9]+(?:[\.,][0-9]+)?)\s*(kg|g|mg|t)?/i;
    const rangeMatch = fullText.match(rangeRegex);
    if (rangeMatch) {
      const minVal = parseFloat(rangeMatch[1].replace(',', '.'));
      const maxVal = parseFloat(rangeMatch[3].replace(',', '.'));
      if (!isNaN(minVal)) {
        min_capacity = minVal;
        confidences.min_capacity = 96;
      }
      if (!isNaN(maxVal)) {
        max_capacity = maxVal;
        confidences.max_capacity = 96;
      }
      if (rangeMatch[4]) {
        unit = rangeMatch[4].toLowerCase();
      }
    }

    // 6. Direct Max Capacity (Max = 30 kg, Max: 30kg, Max 30)
    if (max_capacity === null) {
      const maxRegex = /(?:max(?:imum)?)\.?(?:[:=\s]*)([0-9]+(?:[\.,][0-9]+)?)\s*(kg|g|mg|t)?/i;
      const maxMatch = fullText.match(maxRegex);
      if (maxMatch) {
        const val = parseFloat(maxMatch[1].replace(',', '.'));
        if (!isNaN(val)) {
          max_capacity = val;
          confidences.max_capacity = 94;
          if (maxMatch[2]) unit = maxMatch[2].toLowerCase();
        }
      }
    }

    // 7. Direct Min Capacity (Min = 0.2 kg, Min 0.2)
    if (min_capacity === null) {
      const minRegex = /(?:min(?:imum)?)\.?(?:[:=\s]*)([0-9]+(?:[\.,][0-9]+)?)\s*(kg|g|mg|t)?/i;
      const minMatch = fullText.match(minRegex);
      if (minMatch) {
        const val = parseFloat(minMatch[1].replace(',', '.'));
        if (!isNaN(val)) {
          min_capacity = val;
          confidences.min_capacity = 94;
        }
      }
    }

    // 8. Verification Scale Interval 'e' (e = 0.01 kg, e: 0.01kg, e=0.010)
    // Avoid matching words ending with 'e' (must have word boundary or standalone letter 'e')
    const eRegex = /(?:^|\s)e\s*[:=\s\|\[]+([0-9]+(?:[\.,][0-9]+)?)\s*(kg|g|mg|t)?/im;
    const eMatch = fullText.match(eRegex);
    if (eMatch) {
      const val = parseFloat(eMatch[1].replace(',', '.'));
      if (!isNaN(val)) {
        verification_scale_interval = val;
        confidences.verification_scale_interval = 94;
      }
    }

    // 9. Actual Scale Interval 'd' (d = 0.005 kg, d: 0.005kg, d=0.005)
    const dRegex = /(?:^|\s)d\s*[:=\s\|\[]+([0-9]+(?:[\.,][0-9]+)?)\s*(kg|g|mg|t)?/im;
    const dMatch = fullText.match(dRegex);
    if (dMatch) {
      const val = parseFloat(dMatch[1].replace(',', '.'));
      if (!isNaN(val)) {
        scale_interval = val;
        confidences.scale_interval = 94;
      }
    }

    // 10. Accuracy Class (OIML R-76: I, II, III, IIII)
    const classRegex = /(?:accuracy\s*class|class)\s*[:=\s]*\(?([IVX1-4]+)\)?/i;
    const classMatch = fullText.match(classRegex);
    if (classMatch && classMatch[1]) {
      let rawClass = classMatch[1].toUpperCase();
      if (rawClass === '1') rawClass = 'I';
      if (rawClass === '2') rawClass = 'II';
      if (rawClass === '3' || rawClass === 'II') rawClass = 'III'; // In OIML R76, III is standard medium commercial
      if (rawClass === '4') rawClass = 'IIII';
      if (['I', 'II', 'III', 'IIII'].includes(rawClass)) {
        accuracy_class = rawClass;
        confidences.accuracy_class = 95;
      }
    } else {
      // Fallback check for roman numerals in parentheses e.g. "(III)"
      const parenMatch = fullText.match(/\(([IVX]{1,4})\)/i);
      if (parenMatch) {
        accuracy_class = parenMatch[1].toUpperCase();
        confidences.accuracy_class = 90;
      }
    }

    // 11. Instrument Type determination
    if (max_capacity && max_capacity <= 5) {
      instrument_type = 'Precision / Laboratory Balance';
    } else if (max_capacity && max_capacity <= 150) {
      instrument_type = 'Non-Automatic Weighing Instrument (Bench/Platform Scale)';
    } else if (max_capacity && max_capacity > 150) {
      instrument_type = 'Heavy Duty Platform / Weighbridge Scale';
    } else {
      instrument_type = 'Non-Automatic Weighing Instrument (General)';
    }

    return {
      extracted: {
        manufacturer,
        model_number,
        serial_number,
        instrument_type,
        accuracy_class: accuracy_class || 'III',
        max_capacity,
        min_capacity,
        scale_interval,
        verification_scale_interval,
        unit: unit || 'kg'
      },
      confidences
    };
  }
}
