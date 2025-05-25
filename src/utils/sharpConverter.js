// import sharp from 'sharp';
// sharp('public/vite.svg')
//   .resize(1024, 1024)
//   .png()
//   .toFile('icon.png')
//   .then(() => console.log('PNG готов!'))
//   .catch((err) => console.error(err));
// import fs from 'fs/promises';
// import sharp from 'sharp';
// import pngToIco from 'png-to-ico';

// const inputPngPath = '../../public/icons/icons/png/256x256.png';
// const outputIcoPath = 'output.ico';

// async function createMultiSizeIcoFromPng() {
//   const sizes = [16, 32, 48, 256];

//   const resizedPngBuffers = await Promise.all(
//     sizes.map(size =>
//       sharp(inputPngPath)
//         .resize(size, size, {
//           fit: 'contain',
//           kernel: sharp.kernel.lanczos3,
//           withoutEnlargement: true
//         })
//         .png()
//         .toBuffer()
//     )
//   );

//   const icoBuffer = await pngToIco(resizedPngBuffers);

//   await fs.writeFile(outputIcoPath, icoBuffer);

//   console.log('Мульти-ICO создан:', outputIcoPath);
// }

// createMultiSizeIcoFromPng().catch(console.error);

// import fs from 'fs/promises';
// import { parseICO } from 'icojs';
// import sharp from 'sharp';

// async function icoToBmp() {
//   // const icoBuffer = await fs.readFile(
//   //   '../../public/icons/icons/png/256x256.png',
//   // );
//   const icoBuffer = await fs.readFile('./input.jpg');
//   const images = await parseICO(icoBuffer);

//   const firstImage = images[0];

//   await sharp(firstImage.buffer)
//     .resize(50, 157, {
//       fit: 'contain',
//     })
//     .toFile('output.bmp');
// }

// icoToBmp().catch(console.error);

// import fs from 'fs/promises';
// import sharp from 'sharp';

// async function jpgToBmp() {
//   const imageBuffer = await fs.readFile('./input.jpg');
//   await sharp(imageBuffer)
//     .resize(50, 157, {
//       fit: 'contain',
//       kernel: sharp.kernel.lanczos3,
//       background: { r: 255, g: 255, b: 255, alpha: 1 },
//     })
//     .toFile('output.bmp');
// }

// import sharp from 'sharp';
// import { exec } from 'child_process';
// import { promisify } from 'util';
// const execAsync = promisify(exec);

// async function convert(fitMode) {
//   const tempPng = `temp_${fitMode}.png`;
//   const outputBmp = `output_${fitMode}.bmp`;

//   try {
//     const width = 57;
//     const height = 150;

//     // resize исходника с нужным fit
//     const resizedBuffer = await sharp('256x256.png')
//       .resize(width, height, { fit: fitMode })
//       .toBuffer();

//     // создаём белый фон нужного размера
//     const background = {
//       create: {
//         width,
//         height,
//         channels: 3,
//         background: '#FFFFFF',
//       },
//     };

//     // накладываем resized поверх белого фона
//     await sharp(background)
//       .composite([{ input: resizedBuffer }])
//       .flatten({ background: '#FFFFFF' })
//       .toFile(tempPng);

//     // конвертируем через magick в BMP, убираем альфу
//     await execAsync(
//       `magick convert ${tempPng} -background white -alpha remove -alpha off BMP3:${outputBmp}`,
//     );

//     console.log(`✅ ${fitMode} → BMP создан`);
//   } catch (err) {
//     console.error(`❌ ${fitMode} →`, err);
//   }
// }

// const fits = ['cover', 'contain', 'fill', 'inside', 'outside'];

// (async () => {
//   for (const fit of fits) {
//     await convert(fit);
//   }
// })();
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function svgToBmp(fitMode) {
  const tempPng = `temp_${fitMode}.png`;
  const outputBmp = `output_${fitMode}.bmp`;

  try {
    const canvasWidth = 57;
    const canvasHeight = 150;

    // Рендерим SVG в буфер с нужным fit и максимальным сохранением пропорций
    // Sharp при resize с fit: contain/reserve пропорции, а результат может быть меньше canvas
    const resizedBuffer = await sharp('input.svg')
      .resize(canvasWidth, canvasHeight, {
        fit: fitMode,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toBuffer();

    // Получаем размеры полученного ресайза (он может быть меньше canvas)
    const metadata = await sharp(resizedBuffer).metadata();

    // Создаем белый фон нужного размера
    const background = {
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background: '#FFFFFF',
      },
    };

    // Вычисляем позицию для центрирования
    const top = Math.floor((canvasHeight - metadata.height) / 2);
    const left = Math.floor((canvasWidth - metadata.width) / 2);

    // Накладываем ресайзнутый SVG поверх белого фона по центру
    await sharp(background)
      .composite([{ input: resizedBuffer, top, left }])
      .flatten({ background: '#FFFFFF' })
      .toFile(tempPng);

    // Конвертируем через magick в BMP с удалением альфа-канала
    await execAsync(
      `magick convert ${tempPng} -background white -alpha remove -alpha off BMP3:${outputBmp}`,
    );

    console.log(`✅ ${fitMode} → BMP создан с белым фоном и центрированием`);
  } catch (err) {
    console.error(`❌ ${fitMode} →`, err);
  }
}

const fits = ['cover', 'contain', 'fill', 'inside', 'outside'];

(async () => {
  for (const fit of fits) {
    await svgToBmp(fit);
  }
})();
