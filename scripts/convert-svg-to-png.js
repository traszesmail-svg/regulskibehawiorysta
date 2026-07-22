const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SVG_DIR = 'C:\\projekt\\pdf\\content\\guides\\covers';
const OUT_DIR = 'C:\\projekt\\regulskibehawiorysta\\public\\branding\\pdf-covers';

async function convertCovers() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));
  
  for (const file of files) {
    const inputPath = path.join(SVG_DIR, file);
    const outputPath = path.join(OUT_DIR, file.replace('.svg', '.png'));
    
    console.log(`Converting ${file}...`);
    try {
      await sharp(inputPath, { density: 300 })
        .resize({ width: 800 })
        .png()
        .toFile(outputPath);
      console.log(`Success: ${outputPath}`);
    } catch (e) {
      console.error(`Failed to convert ${file}:`, e);
    }
  }
}

convertCovers();
