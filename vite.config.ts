import { defineLibViteConfig } from "sborshik/vite";
import { ConfigsManager } from "sborshik/utils";
 
export default defineLibViteConfig(ConfigsManager.create(), {
    build: {
        rollupOptions: {
            external: [
                'react/jsx-runtime',
              ],
        },
    }
})