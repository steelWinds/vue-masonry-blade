/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			src: fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	root: './playground',
	test: {
		browser: {
			enabled: true,
			headless: true,
			instances: [{ browser: 'chromium' }],
			provider: playwright(),
		},
	},
});
