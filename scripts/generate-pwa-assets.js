const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generate() {
  const publicDir = path.join(__dirname, '..', 'public');
  const svgPath = path.join(publicDir, 'apicash.svg');
  const rawSvg = fs.readFileSync(svgPath, 'utf8');

  // SVG with white fill for emerald background
  const whiteSvg = rawSvg.replace('<svg ', '<svg fill="#ffffff" ');
  // SVG with emerald fill (#059669) for transparent / any
  const emeraldSvg = rawSvg.replace('<svg ', '<svg fill="#059669" ');

  // 1. Maskable 512x512 (Emerald background, white logo inside safe zone)
  const logo512Buf = await sharp(Buffer.from(whiteSvg))
    .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 5, g: 150, b: 105, alpha: 1 } // #059669
    }
  })
    .composite([{ input: logo512Buf, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'icon-512x512.png'));

  // 2. Maskable 192x192
  const logo192Buf = await sharp(Buffer.from(whiteSvg))
    .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 5, g: 150, b: 105, alpha: 1 } // #059669
    }
  })
    .composite([{ input: logo192Buf, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'icon-192x192.png'));

  // 3. Screenshots for PWA store review (desktop 1280x720, mobile 720x1280)
  // Desktop screenshot
  const screenshotLogoDesktop = await sharp(Buffer.from(whiteSvg))
    .resize(240, 240, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 } // slate-900
    }
  })
    .composite([{ input: screenshotLogoDesktop, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'screenshot-desktop.png'));

  // Mobile screenshot
  const screenshotLogoMobile = await sharp(Buffer.from(whiteSvg))
    .resize(200, 200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 720,
      height: 1280,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 } // slate-900
    }
  })
    .composite([{ input: screenshotLogoMobile, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'screenshot-mobile.png'));

  console.log('All PWA assets generated successfully from apicash.svg');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
