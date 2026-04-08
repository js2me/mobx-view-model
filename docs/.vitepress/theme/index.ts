// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ReactImportDeprecationWarning from './components/ReactImportDeprecationWarning.vue'
import ReactMark from './components/ReactMark.vue'
import './style.css'
import 'uno.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp({ app }) {
    app.component('ReactMark', ReactMark)
    app.component('ReactImportDeprecationWarning', ReactImportDeprecationWarning)
  },
} satisfies Theme
