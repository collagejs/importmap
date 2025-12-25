import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      bundledPackages: ['@collagejs/shared'],
      rollupTypes: true,
      exclude: ['tests/**/*'],
    })
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es']
    },
  },
});