---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: '@{packageJson.name}'
  text: '⚡ Clean MVVM for React / Solid + MobX ⚡'
  image:
    src: /logo.png
  actions:
    - theme: brand
      text: Get Started
      link: /introduction/overview.md
    - theme: alt
      text: View on GitHub
      link: https://github.com/@{packageJson.author}/@{packageJson.name}

features:
  - title: MobX-based
    icon: <span class="i-logos:mobx"></span>
    details: Experience the power of MobX
  - title: TypeScript
    icon: <span class="i-logos:typescript-icon"></span>
    details: Out-of-box TypeScript support
  - title: Dynamic
    icon: 🌪️
    details: Create and destroy view models on the fly
  - title: DevTools
    icon: 🛠️
    details: Inspect and debug ViewModel instances in real time (WIP)
    link: /other/dev-tools
  - title: Vite Plugin
    icon: ⚡
    details: Seamless integration with Vite dev server and HMR
    link: /other/vite-plugin
  - title: SSR Ready
    icon: 🖥️
    details: Server-side rendering support out of the box
---
