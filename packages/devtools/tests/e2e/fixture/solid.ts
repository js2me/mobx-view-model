const params = new URLSearchParams(location.search);

async function loadDevtools() {
  if (params.get('entry') === 'module') {
    const { ViewModelDevtools } = await import('../../../dist/index.js');
    return ViewModelDevtools.define({ position: 'bottom-right' });
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../../../dist/auto.global.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return (globalThis as any).ViewModelDevtools.define();
}

// Keep the host import dynamic so both initialization orders are exercised.
const earlyDevtools =
  params.get('order') === 'devtools-first' ? await loadDevtools() : undefined;
const { mountApp } = await import('./solid-app');
const store = mountApp(document.querySelector('#app')!);
const devtools = earlyDevtools ?? (await loadDevtools());
if (params.get('entry') === 'module') devtools.setStore(store);
// The standalone entry must discover the store without an explicit connection.
document.body.dataset.ready = 'true';
