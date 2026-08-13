const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Directories to process (relative to project root)
const baseDir = path.join(__dirname, '..', 'assets', 'tv-platform-edits');

const targetDirs = [
  path.join(baseDir, 'Archaven'),
  path.join(baseDir, 'Kreation', 'amazon-ready'),
  path.join(baseDir, 'Hektic TV', 'amazon-ready'),
  path.join(baseDir, 'Streamshare', 'amazon-ready')
];

let processedCount = 0;
let skippedCount = 0;
let errorCount = 0;
const errors = [];

async function processImage(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    const tempPath = filePath + '.tmp';
    
    if (metadata.hasAlpha) {
      // Flatten onto a solid dark background (#1a1a2e - dark blue-black)
      await sharp(filePath)
        .flatten({ background: { r: 26, g: 26, b: 46, alpha: 1 } })
        .toFormat('png', { quality: 95, compressionLevel: 6 })
        .toFile(tempPath);
      
      // Replace original with processed
      fs.renameSync(tempPath, filePath);
      console.log(`  ✅ Flattened (had alpha): ${path.basename(filePath)}`);
    } else {
      // Re-save to ensure consistent PNG format without any potential transparency issues
      await sharp(filePath)
        .png({ quality: 95, compressionLevel: 6 })
        .toFile(tempPath);
      
      // Replace original with processed
      fs.renameSync(tempPath, filePath);
      console.log(`  ✅ Verified (no alpha): ${path.basename(filePath)}`);
    }
    processedCount++;
  } catch (err) {
    errorCount++;
    errors.push({ file: filePath, error: err.message });
    console.error(`  ❌ Error processing: ${path.basename(filePath)} - ${err.message}`);
  }
}

async function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`  ⚠️ Directory not found: ${dirPath}`);
    return;
  }
  
  const files = fs.readdirSync(dirPath);
  const imageFiles = files.filter(f => 
    f.toLowerCase().endsWith('.png') || 
    f.toLowerCase().endsWith('.jpg') || 
    f.toLowerCase().endsWith('.jpeg')
  );
  
  if (imageFiles.length === 0) {
    console.log(`  ℹ️ No images found in: ${dirPath}`);
    return;
  }
  
  console.log(`\n📁 Processing: ${dirPath.replace(baseDir, 'assets/tv-platform-edits')}`);
  console.log(`   Found ${imageFiles.length} image(s)`);
  
  for (const file of imageFiles) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isFile()) {
      await processImage(filePath);
    }
  }
}

async function main() {
  console.log('🚀 Amazon Appstore Image Flattening Tool');
  console.log('=========================================');
  console.log('Target: Remove alpha channels and flatten PNGs');
  console.log('Background: Dark (#1a1a2e) for transparency replacement');
  console.log('');
  
  for (const dir of targetDirs) {
    await processDirectory(dir);
  }
  
  console.log('');
  console.log('=========================================');
  console.log('✅ PROCESSING COMPLETE');
  console.log(`   Images flattened/verified: ${processedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Error Details:');
    errors.forEach(e => console.log(`   - ${path.basename(e.file)}: ${e.error}`));
  }
  
  console.log('');
  console.log('All images are now ready for Amazon Appstore submission.');
}

main().catch(console.error);