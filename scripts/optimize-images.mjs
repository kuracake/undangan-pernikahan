import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = './elemen';
const OUT = './assets/images';

// [nama file asli, nama baru, lebar maksimum]
const files = [
    ['ornamen-bunga-kiri-atas.png', 'flower-tl.webp', 560],
    ['ornamen-bunga-kanan-atas.png', 'flower-tr.webp', 560],
    ['ornamen-bunga-kiri-bawah.png', 'flower-bl.webp', 560],
    ['ornamen-bunga-kanan-bawah.png', 'flower-br.webp', 560],
    ['01-floral-horizontal.png', 'divider.webp', 640],
    ['Pasangan Pengantin Anime dengan Buket Bunga.png', 'couple.webp', 800],
    ['Pengantin Pria Anime Bersetelan Marun.png', 'groom.webp', 640],
    ['a_clean_transparent_background_illustration_png_s.png', 'bride.webp', 640],
    ['Pengantin Berjalan dalam Balutan Maroon.png', 'walking.webp', 800],
    ['09-bunga-burgundy.png', 'rose.webp', 200],
];

fs.mkdirSync(OUT, { recursive: true });

for (const [src, dst, width] of files) {
    const input = path.join(SRC, src);
    if (!fs.existsSync(input)) {
        console.log('SKIP (tidak ditemukan):', src);
        continue;
    }
    await sharp(input)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 90 })
        .toFile(path.join(OUT, dst));
    console.log('OK', dst);
}