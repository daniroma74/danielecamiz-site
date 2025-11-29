#!/usr/bin/env node
/**
 * WebP Conversion Script
 * Converts all JPG/PNG images to WebP format for better performance
 *
 * Usage:
 *   node scripts/convert-to-webp.js [options]
 *
 * Options:
 *   --dry-run    Show what would be converted without actually converting
 *   --quality N  WebP quality (0-100, default: 85)
 *   --dir PATH   Specific directory to convert (default: ../frontend/img)
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const qualityIdx = args.indexOf('--quality');
const quality = qualityIdx !== -1 ? parseInt(args[qualityIdx + 1], 10) : 85;
const dirIdx = args.indexOf('--dir');
const targetDir = dirIdx !== -1 ? args[dirIdx + 1] : path.join(__dirname, '..', '..', 'frontend', 'img');

console.log('🖼️  WebP Conversion Script');
console.log('========================\n');
console.log(`Target directory: ${targetDir}`);
console.log(`Quality: ${quality}`);
console.log(`Dry run: ${dryRun ? 'YES (no files will be modified)' : 'NO'}\n`);

// Collect all image files
async function findImages(dir, results = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await findImages(fullPath, results);
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

// Convert single image to WebP
async function convertToWebP(inputPath) {
  const parsed = path.parse(inputPath);
  const outputPath = path.join(parsed.dir, `${parsed.name}.webp`);

  // Check if WebP already exists
  try {
    await fs.access(outputPath);
    console.log(`  ⏭️  Skipped (WebP exists): ${path.relative(targetDir, inputPath)}`);
    return { skipped: true };
  } catch {
    // WebP doesn't exist, proceed with conversion
  }

  if (dryRun) {
    console.log(`  🔍 Would convert: ${path.relative(targetDir, inputPath)}`);
    return { dryRun: true };
  }

  try {
    const inputStats = await fs.stat(inputPath);
    const inputSize = inputStats.size;

    await sharp(inputPath)
      .webp({ quality })
      .toFile(outputPath);

    const outputStats = await fs.stat(outputPath);
    const outputSize = outputStats.size;
    const savings = ((inputSize - outputSize) / inputSize * 100).toFixed(1);

    console.log(`  ✅ ${path.relative(targetDir, inputPath)}`);
    console.log(`     ${(inputSize / 1024).toFixed(1)} KB → ${(outputSize / 1024).toFixed(1)} KB (${savings}% smaller)`);

    return {
      success: true,
      inputSize,
      outputSize,
      savings: parseFloat(savings)
    };
  } catch (err) {
    console.error(`  ❌ Error converting ${path.relative(targetDir, inputPath)}: ${err.message}`);
    return { error: true };
  }
}

// Main execution
async function main() {
  try {
    console.log('📁 Scanning for images...\n');
    const images = await findImages(targetDir);

    if (images.length === 0) {
      console.log('No images found to convert.');
      return;
    }

    console.log(`Found ${images.length} images to process.\n`);

    const results = {
      converted: 0,
      skipped: 0,
      errors: 0,
      totalInputSize: 0,
      totalOutputSize: 0
    };

    for (const img of images) {
      const result = await convertToWebP(img);

      if (result.success) {
        results.converted++;
        results.totalInputSize += result.inputSize;
        results.totalOutputSize += result.outputSize;
      } else if (result.skipped) {
        results.skipped++;
      } else if (result.error) {
        results.errors++;
      }
    }

    console.log('\n📊 Summary');
    console.log('==========');
    console.log(`✅ Converted: ${results.converted}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`❌ Errors: ${results.errors}`);

    if (results.converted > 0 && !dryRun) {
      const totalSavings = ((results.totalInputSize - results.totalOutputSize) / results.totalInputSize * 100).toFixed(1);
      console.log(`💾 Total size: ${(results.totalInputSize / 1024 / 1024).toFixed(2)} MB → ${(results.totalOutputSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📉 Space saved: ${totalSavings}%`);
    }

    if (dryRun) {
      console.log('\n💡 This was a dry run. Re-run without --dry-run to actually convert files.');
    } else if (results.converted > 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Update your HTML/CSS to use <picture> tags with WebP fallback');
      console.log('   2. Test that images display correctly in all browsers');
      console.log('   3. Run Lighthouse to verify performance improvements');
      console.log('\n📖 See WEBP_GUIDE.md for implementation examples');
    }

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
