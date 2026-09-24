import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import path from 'path';

async function testCrop() {
  const imgPath = path.resolve('storage/temp/ocr/bedac6b5-bda2-4190-9056-98103484c210.png');
  const worker = await createWorker('eng');

  // Let's test with PSM 7 (single line) and PSM 6 (single block)
  const boxes = [
    { name: 'Model (DS-252)', top: 298, height: 65 },
    { name: 'Serial (ETPL/DS252/240781)', top: 368, height: 65 },
    { name: 'Max (30 kg)', top: 438, height: 65 },
    { name: 'Min (0.2 kg)', top: 508, height: 65 },
    { name: 'e (0.01 kg)', top: 578, height: 65 },
    { name: 'd (0.005 kg)', top: 648, height: 65 }
  ];

  for (const b of boxes) {
    const cp = path.resolve(`storage/temp/ocr/crop_${b.name.replace(/[^a-z0-9]/gi, '_')}.png`);
    // Trim 8px from left and right to avoid the dark outer border box lines!
    await sharp(imgPath)
      .extract({ left: 355, top: b.top, width: 450, height: b.height })
      .resize({ width: 900 })
      .grayscale()
      .normalize()
      .threshold(160) // Clean binarization removes grey artifacts and makes black text pop!
      .toFile(cp);

    await worker.setParameters({ tessedit_pageseg_mode: '7' as any });
    const r7 = await worker.recognize(cp);

    await worker.setParameters({ tessedit_pageseg_mode: '6' as any });
    const r6 = await worker.recognize(cp);

    console.log(`[${b.name}] PSM 7: "${r7.data.text.trim()}" | PSM 6: "${r6.data.text.trim()}"`);
  }

  await worker.terminate();
}

testCrop().catch(console.error);
