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

const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;

let processedCount = 0;
let errorCount = 0;
const errors = [];
const resizedFiles = [];

async function processImage(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    const tempPath = filePath + '.tmp';
    
    // Resize to 1920x1080, stretching/cropping as needed
    await sharp(filePath)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'fill', // Stretch to fill exact dimensions
        withoutEnlargement: false // Allow upscaling
      })
      .flatten({ background: { r: 26, g: 26, b: 46, alpha: 1 } }) // Ensure no alpha
      .toFormat('png', { quality: 95, compressionLevel: 6 })
      .toFile(tempPath);
    
    // Replace original with processed
    fs.renameSync(tempPath, filePath);
    
    const relativePath = path.relative(baseDir, filePath);
    resizedFiles.push(relativePath);
    console.log(`  ✅ Resized: ${path.basename(filePath)} (${metadata.width}x${metadata.height} → ${TARGET_WIDTH}x${TARGET_HEIGHT})`);
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
  console.log('🖼️  Fire TV Screenshot Resizer');
  console.log('=========================================');
  console.log(`Target Resolution: ${TARGET_WIDTH} x ${TARGET_HEIGHT} pixels`);
  console.log('Format: 24-bit PNG (no alpha)');
  console.log('');
  
  for (const dir of targetDirs) {
    await processDirectory(dir);
  }
  
  console.log('');
  console.log('=========================================');
  console.log('✅ PROCESSING COMPLETE');
  console.log(`   Images resized: ${processedCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Error Details:');
    errors.forEach(e => console.log(`   - ${path.basename(e.file)}: ${e.error}`));
  }
  
  console.log('');
  console.log('📋 Resized Files:');
  resizedFiles.forEach(f => console.log(`   - ${f}`));
  
  console.log('');
  console.log('All screenshots are now Fire TV compliant (1920x1080).');
}

main().catch(console.error);