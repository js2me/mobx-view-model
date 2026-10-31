import { loadDevtools } from '../../../../../docs/.internal/scripts/load-devtools';

await loadDevtools();
document.querySelector('#ready')!.textContent = 'Docs demo ready';
