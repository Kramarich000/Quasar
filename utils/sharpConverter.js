import sharp from 'sharp';
sharp('public/vite.svg')
  .resize(1024, 1024) 
  .png()
  .toFile('icon.png')
  .then(() => console.log('PNG готов!'))
  .catch((err) => console.error(err));
