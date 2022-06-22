import { defineConfig,build } from 'vite'
import vue from '@vitejs/plugin-vue'

const config = defineConfig({
  base: 'http://cdn.merlin218.top/',
  plugins: [vue()]
})


// https://vitejs.dev/config/
export default config;
