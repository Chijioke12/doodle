import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import legacy from '@vitejs/plugin-legacy';

const removeSimulatorPlugin = () => {
  return {
    name: 'remove-simulator',
    transformIndexHtml(html: string, ctx: any) {
      if (ctx.server) return html; // Keep in dev
      
      // Remove the SVG simulator
      let newHtml = html.replace(/<svg id="phone-svg"[\s\S]*?<\/svg>/, '');
      
      // Inject CSS to center the game canvas without the phone wrapper
      newHtml = newHtml.replace(
        '</head>',
        `  <style>
      #phone-container { width: 240px !important; height: 320px !important; transform: none !important; }
      #app { left: 0 !important; top: 0 !important; position: relative !important; border-radius: 0 !important; }
    </style>
  </head>`
      );
      
      return newHtml;
    }
  };
};

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      legacy({
        targets: ['defaults', 'not IE 11']
      }),
      removeSimulatorPlugin()
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
