const fs = require('fs');
const path = require('path');

// Fonction récursive pour copier un dossier
function copyDirectory(src, dest) {
  // Créer le dossier de destination s'il n'existe pas
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);

  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stats = fs.statSync(srcPath);

    if (stats.isDirectory()) {
      // C'est un dossier, copier récursivement
      copyDirectory(srcPath, destPath);
    } else {
      // C'est un fichier
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied: ${path.relative(path.join(__dirname, '..'), srcPath)}`);
    }
  });
}

// Copier tout le dossier assets
const assetsSrcDir = path.join(__dirname, '../assets');
const assetsDestDir = path.join(__dirname, '../dist/assets');

if (fs.existsSync(assetsSrcDir)) {
  console.log('📁 Copie des assets...');
  copyDirectory(assetsSrcDir, assetsDestDir);
  console.log('✅ All assets copied successfully');
} else {
  console.warn('⚠️ Assets folder not found');
}