const script = document.createElement('script');

if (location.href.startsWith('file:///')) {
  const filePath = location.href.split('/docs/')[0];
  script.src = `${filePath}/dist/auto.global.js`;
} else {
  script.src = `https://unpkg.com/mobx-view-model-devtools/auto.global.js`;
}

document.head.appendChild(script);
