const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const archiver = require('archiver');
const { version } = require('../package.json');

async function zip() {
  const source = path.resolve(__dirname, '../../app-bundles/app');
  if (!fs.existsSync(path.join(source, 'index.html'))) throw new Error('Run npm run build first');
  const destination = path.resolve(source, '..', `bundle-v${version}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('warning', (error) => archive.destroy(error));
  const writing = pipeline(archive, fs.createWriteStream(destination));
  archive.directory(source, 'app');
  await Promise.all([archive.finalize(), writing]);
  console.log(`Bundle created: ${destination}`);
}

zip().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
