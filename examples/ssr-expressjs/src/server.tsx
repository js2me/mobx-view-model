import express from 'express';
import ReactDOMServer from 'react-dom/server';
import { App } from './app.js';
import { getRouteData } from './routes.js';

const app = express();
const port = Number(process.env.PORT ?? 6473);

app.use('/public', express.static('public'));

app.get('*', async (req, res) => {
  const route = await getRouteData(req.path);
  if (!route) {
    res.status(404).send('Not found');
    return;
  }

  const appHtml = ReactDOMServer.renderToString(<App route={route} />);
  const dataJson = JSON.stringify(route).replace(/</g, '\\u003c');

  res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${route.pageTitle}</title>
    <link rel="stylesheet" href="/public/styles.css" />
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script>window.__SSR_DATA__ = ${dataJson};</script>
    <script type="module" src="/public/client.js"></script>
  </body>
</html>`);
});

app.listen(port, () => {
  console.log(`SSR express example running on http://localhost:${port}`);
});
