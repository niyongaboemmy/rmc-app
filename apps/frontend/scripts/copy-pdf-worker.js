// Copies the pdfjs-dist worker into public/ so it is served as a plain static
// asset instead of being emitted as a webpack chunk. The worker ships as an
// already-minified ES module (pdf.worker.min.mjs); when webpack emits it as a
// chunk, Next's JS minifier (SWC) re-parses it as a script and dies on the
// top-level `import.meta`/`export`. Serving it from public/ keeps it out of the
// bundle/minify pipeline entirely. Run on prebuild/predev so it always tracks
// the installed pdfjs-dist version — do not commit the copied file.
const fs = require('fs');
const path = require('path');

const src = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
const destDir = path.join(__dirname, '..', 'public');
const dest = path.join(destDir, 'pdf.worker.min.mjs');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`[copy-pdf-worker] ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dest)}`);
