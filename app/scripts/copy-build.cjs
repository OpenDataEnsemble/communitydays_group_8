const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '../dist');
const destination = path.resolve(__dirname, '../../app-bundles/app');
if (!fs.existsSync(path.join(source, 'index.html'))) throw new Error('Run vite build first');
fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });
console.log(`Build copied to ${destination}`);
