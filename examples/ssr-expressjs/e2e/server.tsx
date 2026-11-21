import { build } from 'esbuild';
import express from 'express';
import { renderToString } from 'react-dom/server';
import { Shop, hasPage } from './shop';

const bundle = await build({
  entryPoints: ['client.tsx'],
  bundle: true,
  write: false,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const app = express();
app.get('/client.js', (_, res) => res.type('js').send(bundle.outputFiles[0].text));
app.get('/favicon.ico', (_, res) => res.sendStatus(204));
app.get('*', (req, res) => {
  const inCart = (req.headers.cookie ?? '').split('; ').includes('notebook=1');
  const html = renderToString(<Shop path={req.path} inCart={inCart} />);
  res.status(hasPage(req.path) ? 200 : 404).send(
    `<!doctype html><div id="root" data-cart="${inCart}">${html}</div><script type="module" src="/client.js"></script>`,
  );
});
app.listen(4186, '127.0.0.1');
