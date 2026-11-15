// Copies the game files from the repository root into www/, which is what the iPhone app bundles.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
['index.html', 'privacy.html', 'mqtt.min.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].forEach(f => fs.copyFileSync(path.join(root, f), path.join(out, f)));
fs.readdirSync(path.join(root, 'fonts')).forEach(f => fs.copyFileSync(path.join(root, 'fonts', f), path.join(out, 'fonts', f)));
console.log('Copied the game into www/');
