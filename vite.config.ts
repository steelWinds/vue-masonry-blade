/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
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
