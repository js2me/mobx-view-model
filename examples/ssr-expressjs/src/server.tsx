import "./app/bootstrap/client";

import express from 'express';
import ReactDOMServer from 'react-dom/server';
import { Globals } from './globals';
import { App } from './app';

const app = express();
const port = Number(process.env.PORT ?? 6473);

app.use('/dist', express.static('dist'));
app.use('/public', express.static('public'));

app.get('*', async (req, res) => {
  const globals = new Globals({
    router: {
      history: {
        initialEntries: [req.path]
      }
    }
  })

  const appHtml = ReactDOMServer.renderToString(<App globals={globals} />);
  const dataJson = JSON.stringify(globals.toSnapshot()).replace(/</g, '\\u003c');

  res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${globals.stores.appInfo.title}</title>
    <link rel="stylesheet" href="/dist/styles.css" />
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script>window.__SSR_DATA__ = ${dataJson};</script>
    <script type="module" src="/dist/client.js"></script>
  </body>
</html>`);
});

app.listen(port, () => {
  console.log(`SSR express example running on http://localhost:${port}`);
});
