/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			src: fileURLToPath(new URL('./src', import.meta.url)),
			tests: fileURLToPath(new URL('./tests', import.meta.url)),
		},
	},
	root: './playground',
	test: {
		environment: 'jsdom',
		root: '.',
	},
});
