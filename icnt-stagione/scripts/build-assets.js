#!/usr/bin/env node

/**
 * Build Assets Script
 * Minifies CSS and JavaScript files for production
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import esbuild from 'esbuild';
import postcss from 'postcss';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Configurazione
const config = {
  css: {
    input: join(rootDir, 'public/css'),
    output: join(rootDir, 'public/css-dist'),
    files: ['style.css', 'lightbox.css', 'share.css', 'cookie-banner.css', 'ux-enhancements.css']
  },
  js: {
    input: join(rootDir, 'public/js'),
    output: join(rootDir, 'public/js-dist'),
    files: ['app.js', 'share.js', 'ux-interactions.js']
  },
  sw: {
    input: join(rootDir, 'public/sw.js'),
    output: join(rootDir, 'public/sw.min.js')
  }
};

// Utilità per logging
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[OK]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  size: (label, before, after) => {
    const reduction = ((1 - after / before) * 100).toFixed(1);
    console.log(`  ${label}: ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB (${reduction}% reduction)`);
  }
};

// Crea directory se non esiste
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    log.info(`Created directory: ${dir}`);
  }
}

// Minifica CSS
async function minifyCSS() {
  log.info('Minifying CSS files...');
  ensureDir(config.css.output);

  const processor = postcss([
    autoprefixer(),
    cssnano({
      preset: ['default', {
        discardComments: { removeAll: true },
        normalizeWhitespace: true,
        colormin: true,
        minifyFontValues: true,
        minifyGradients: true,
      }]
    })
  ]);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of config.css.files) {
    const inputPath = join(config.css.input, file);
    const outputPath = join(config.css.output, file);

    try {
      const css = readFileSync(inputPath, 'utf8');
      const before = Buffer.byteLength(css, 'utf8');

      const result = await processor.process(css, {
        from: inputPath,
        to: outputPath
      });

      const after = Buffer.byteLength(result.css, 'utf8');
      writeFileSync(outputPath, result.css);

      totalBefore += before;
      totalAfter += after;
      log.size(file, before, after);
    } catch (error) {
      log.error(`Failed to minify ${file}: ${error.message}`);
      throw error;
    }
  }

  log.success(`CSS minification complete!`);
  log.size('Total CSS', totalBefore, totalAfter);
  return { before: totalBefore, after: totalAfter };
}

// Minifica JavaScript
async function minifyJS() {
  log.info('Minifying JavaScript files...');
  ensureDir(config.js.output);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of config.js.files) {
    const inputPath = join(config.js.input, file);
    const outputPath = join(config.js.output, file);

    try {
      const before = Buffer.byteLength(readFileSync(inputPath), 'utf8');

      await esbuild.build({
        entryPoints: [inputPath],
        outfile: outputPath,
        minify: true,
        target: 'es2020',
        format: 'iife',
        bundle: false,
        sourcemap: false,
        legalComments: 'none',
      });

      const after = Buffer.byteLength(readFileSync(outputPath), 'utf8');
      totalBefore += before;
      totalAfter += after;
      log.size(file, before, after);
    } catch (error) {
      log.error(`Failed to minify ${file}: ${error.message}`);
      throw error;
    }
  }

  log.success(`JavaScript minification complete!`);
  log.size('Total JS', totalBefore, totalAfter);
  return { before: totalBefore, after: totalAfter };
}

// Minifica Service Worker
async function minifySW() {
  log.info('Minifying Service Worker...');

  try {
    const before = Buffer.byteLength(readFileSync(config.sw.input), 'utf8');

    await esbuild.build({
      entryPoints: [config.sw.input],
      outfile: config.sw.output,
      minify: true,
      target: 'es2020',
      format: 'iife',
      bundle: false,
      sourcemap: false,
      legalComments: 'none',
    });

    const after = Buffer.byteLength(readFileSync(config.sw.output), 'utf8');
    log.size('sw.js', before, after);
    log.success('Service Worker minification complete!');
    return { before, after };
  } catch (error) {
    log.error(`Failed to minify Service Worker: ${error.message}`);
    throw error;
  }
}

// Main build
async function build() {
  console.log('\n='.repeat(60));
  console.log('ICNT-STAGIONE - Asset Build Pipeline');
  console.log('='.repeat(60) + '\n');

  const start = Date.now();

  try {
    // Build CSS
    const cssStats = await minifyCSS();
    console.log('');

    // Build JS
    const jsStats = await minifyJS();
    console.log('');

    // Build SW
    const swStats = await minifySW();
    console.log('');

    // Summary
    const totalBefore = cssStats.before + jsStats.before + swStats.before;
    const totalAfter = cssStats.after + jsStats.after + swStats.after;
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    console.log('='.repeat(60));
    log.success('Build complete!');
    log.size('TOTAL ASSETS', totalBefore, totalAfter);
    log.info(`Build time: ${elapsed}s`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    log.error(`Build failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run build
build();
