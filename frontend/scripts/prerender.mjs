import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const outputPath = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const rootMarker = '<div id="root"></div>';
const vite = await createServer({
  appType: 'custom',
  server: { middlewareMode: true },
});

try {
  const { LandingPage } = await vite.ssrLoadModule('/src/pages/LandingPage.tsx');
  const document = await readFile(outputPath, 'utf8');

  if (!document.includes(rootMarker) || document.indexOf(rootMarker) !== document.lastIndexOf(rootMarker)) {
    throw new Error('Expected exactly one empty React root in the generated index.html.');
  }

  const renderedPage = renderToString(React.createElement(LandingPage));
  await writeFile(outputPath, document.replace(rootMarker, `<div id="root">${renderedPage}</div>`));
} finally {
  await vite.close();
}
