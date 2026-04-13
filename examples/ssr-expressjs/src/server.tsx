import './app/bootstrap/server';

import { fakerRU as faker } from '@faker-js/faker';
import express from 'express';
import ReactDOMServer from 'react-dom/server';
import { App } from './app';
import { Globals } from './globals';
import type { ProductDC } from './shared/api/api';

faker.seed(120);

const app = express();
const port = Number(process.env.PORT ?? 6473);

const allProducts = faker.helpers.multiple(
  (): ProductDC => ({
    id: faker.number.int(),
    originalPrice: +faker.commerce.price({ min: 1, max: 10000 }),
    price: +faker.commerce.price({ min: 1, max: 10000 }),
    rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
    title: faker.commerce.productDescription(),
    reviewsCount: faker.number.int({ min: 0, max: 9999999 }),
    images: faker.helpers.maybe(() =>
      faker.helpers.multiple(() => faker.image.urlPicsumPhotos()),
    ),
  }),
  {
    count: { min: 10, max: 200 },
  },
);

app.use('/dist', express.static('dist'));
app.use('/public', express.static('public'));

app.get('*', async (req, res) => {
  if (req.path === '/api/products') {
    res.status(200).send(JSON.stringify(allProducts));
    return;
  }

  const globals = new Globals({
    router: {
      history: {
        initialEntries: [req.path],
      },
    },
  });

  const appHtml = ReactDOMServer.renderToString(<App globals={globals} />);
  const dataJson = JSON.stringify(globals.toSnapshot()).replace(
    /</g,
    '\\u003c',
  );

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
