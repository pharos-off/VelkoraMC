const fs = require('fs');
const path = require('path');

// Créer le dossier dist/assets/music s'il n'existe pas
const musicSrcDir = path.join(__dirname, '../assets/music');
const musicDestDir = path.join(__dirname, '../dist/assets/music');

// Créer le répertoire de destination
if (!fs.existsSync(musicDestDir)) {
  fs.mkdirSync(musicDestDir, { recursive: true });
  console.log('✅ Dossier dist/assets/music créé');
}

// Copier tous les fichiers MP3
if (fs.existsSync(musicSrcDir)) {
  const files = fs.readdirSync(musicSrcDir);
  
  files.forEach(file => {
    const srcPath = path.join(musicSrcDir, file);
    const stats = fs.statSync(srcPath);
    
    if (stats.isDirectory()) {
      // C'est un dossier, copier récursivement
      const destSubDir = path.join(musicDestDir, file);
      if (!fs.existsSync(destSubDir)) {
        fs.mkdirSync(destSubDir, { recursive: true });
      }
      
      const subFiles = fs.readdirSync(srcPath);
      subFiles.forEach(subFile => {
        const subSrcPath = path.join(srcPath, subFile);
        const subDestPath = path.join(destSubDir, subFile);
        fs.copyFileSync(subSrcPath, subDestPath);
        console.log(`✅ Copié: ${file}/${subFile}`);
      });
    } else {
      // C'est un fichier
      const destPath = path.join(musicDestDir, file);
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copié: ${file}`);
    }
  });
  
  console.log('✅ Assets musicaux copiés avec succès');
} else {
  console.warn('⚠️ Dossier assets/music non trouvé');
}
