#!/usr/bin/env node
/**
 * Script de Otimização de Imagens
 * Converte e comprime imagens para WebP/AVIF
 *
 * Uso: node scripts/optimize-images.js
 *
 * Requer: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Tenta importar sharp, se não existir mostra instruções
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.log('📦 Sharp não encontrado. Para otimizar imagens, execute:');
  console.log('   npm install sharp --save-dev');
  console.log('');
  console.log('Depois execute novamente: node scripts/optimize-images.js');
  process.exit(0);
}

const ASSETS_DIR = path.join(__dirname, '../client/src/assets');
const OUTPUT_DIR = path.join(__dirname, '../client/src/assets/optimized');

// Configurações de otimização
const CONFIG = {
  webp: {
    quality: 80,
    effort: 6,
  },
  avif: {
    quality: 65,
    effort: 6,
  },
  jpeg: {
    quality: 80,
    mozjpeg: true,
  },
  png: {
    compressionLevel: 9,
    palette: true,
  },
  // Tamanhos para responsive images
  sizes: [
    { width: 640, suffix: '-sm' },
    { width: 1024, suffix: '-md' },
    { width: 1920, suffix: '-lg' },
  ],
};

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function optimizeImage(inputPath, outputDir) {
  const filename = path.basename(inputPath, path.extname(inputPath));
  const stats = fs.statSync(inputPath);
  const originalSize = stats.size;

  console.log(`\n📸 Otimizando: ${filename}`);
  console.log(`   Tamanho original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

  const results = [];

  // Gerar versões em diferentes tamanhos e formatos
  for (const size of CONFIG.sizes) {
    // WebP
    const webpPath = path.join(outputDir, `${filename}${size.suffix}.webp`);
    await sharp(inputPath)
      .resize(size.width, null, { withoutEnlargement: true })
      .webp(CONFIG.webp)
      .toFile(webpPath);

    const webpStats = fs.statSync(webpPath);
    results.push({
      format: 'webp',
      size: size.suffix,
      bytes: webpStats.size,
    });

    // AVIF (melhor compressão, suporte mais limitado)
    const avifPath = path.join(outputDir, `${filename}${size.suffix}.avif`);
    await sharp(inputPath)
      .resize(size.width, null, { withoutEnlargement: true })
      .avif(CONFIG.avif)
      .toFile(avifPath);

    const avifStats = fs.statSync(avifPath);
    results.push({
      format: 'avif',
      size: size.suffix,
      bytes: avifStats.size,
    });
  }

  // Calcular economia total
  const webpTotal = results.filter(r => r.format === 'webp').reduce((a, b) => a + b.bytes, 0);
  const avifTotal = results.filter(r => r.format === 'avif').reduce((a, b) => a + b.bytes, 0);

  console.log(
    `   ✅ WebP total: ${(webpTotal / 1024).toFixed(0)} KB (${((1 - webpTotal / originalSize) * 100).toFixed(0)}% menor)`
  );
  console.log(
    `   ✅ AVIF total: ${(avifTotal / 1024).toFixed(0)} KB (${((1 - avifTotal / originalSize) * 100).toFixed(0)}% menor)`
  );

  return results;
}

async function main() {
  console.log('🖼️  Otimizador de Imagens 7Care');
  console.log('================================\n');

  await ensureDir(OUTPUT_DIR);

  // Encontrar imagens grandes para otimizar
  const files = fs
    .readdirSync(ASSETS_DIR)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
    .map(f => ({
      name: f,
      path: path.join(ASSETS_DIR, f),
      size: fs.statSync(path.join(ASSETS_DIR, f)).size,
    }))
    .filter(f => f.size > 100 * 1024) // Apenas arquivos > 100KB
    .sort((a, b) => b.size - a.size);

  if (files.length === 0) {
    console.log('✅ Nenhuma imagem grande encontrada para otimizar.');
    return;
  }

  console.log(`📁 Encontradas ${files.length} imagens para otimizar:\n`);

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const file of files) {
    totalOriginal += file.size;
    const results = await optimizeImage(file.path, OUTPUT_DIR);
    const webpSize = results.filter(r => r.format === 'webp').reduce((a, b) => a + b.bytes, 0);
    totalOptimized += webpSize;
  }

  console.log('\n================================');
  console.log('📊 RESUMO');
  console.log('================================');
  console.log(`   Original total: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Otimizado (WebP): ${(totalOptimized / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Economia: ${((1 - totalOptimized / totalOriginal) * 100).toFixed(0)}%`);
  console.log(`\n📁 Imagens otimizadas salvas em: ${OUTPUT_DIR}`);
  console.log('\n💡 Dica: Use o componente <OptimizedImage> para carregar imagens responsivas.');
}

main().catch(console.error);
