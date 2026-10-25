const fs = require('fs');
const path = require('path');

async function main() {
  const sharp = (await import('sharp')).default;
  const resultsDir = path.join(__dirname, '..', 'web', 'public', 'results');

  if (!fs.existsSync(resultsDir)) {
    console.error('Results directory not found:', resultsDir);
    process.exit(1);
  }

  const dateDirs = fs.readdirSync(resultsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`Found ${dateDirs.length} date directories to inspect.`);

  let processedCount = 0;
  let totalSavedBytes = 0;

  for (const dateDir of dateDirs) {
    const targetDir = path.join(resultsDir, dateDir);
    const files = fs.readdirSync(targetDir);

    for (const file of files) {
      if (file.toLowerCase().endsWith('.jpg')) {
        const jpgPath = path.join(targetDir, file);
        const webpPath = path.join(targetDir, file.replace(/\.jpg$/i, '.webp'));

        const jpgStats = fs.statSync(jpgPath);
        const origSizeKb = Math.round(jpgStats.size / 1024);

        try {
          const webpBuffer = await sharp(jpgPath)
            .resize({ width: 550, withoutEnlargement: true })
            .webp({ quality: 78, effort: 5 })
            .toBuffer();

          fs.writeFileSync(webpPath, webpBuffer);
          const newSizeKb = Math.round(webpBuffer.length / 1024);
          const savedKb = origSizeKb - newSizeKb;
          totalSavedBytes += (jpgStats.size - webpBuffer.length);

          console.log(`✅ [${dateDir}/${file}] ${origSizeKb} KB ➔ ${newSizeKb} KB WebP (saved ${savedKb} KB / ~${Math.round((savedKb/origSizeKb)*100)}%)`);
          processedCount++;
        } catch (err) {
          console.error(`❌ Failed converting ${jpgPath}:`, err.message);
        }
      }
    }
  }

  console.log(`\n🎉 Completed! Converted ${processedCount} sheets to responsive WebP.`);
  console.log(`Total payload reduction: ~${Math.round(totalSavedBytes / 1024 / 1024 * 10) / 10} MB saved across historical cache!`);
}

main().catch(console.error);
