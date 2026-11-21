import { hydrateRoot } from 'react-dom/client';
import { Shop } from './shop';

const root = document.getElementById('root')!;
hydrateRoot(root, <Shop path={location.pathname} inCart={root.dataset.cart === 'true'} />, {
  onRecoverableError: error => window.reportError(error),
});
