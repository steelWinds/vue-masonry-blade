import { defineConfig } from 'tsdown';
import removePlugin from 'unplugin-remove/esbuild';

export default defineConfig({
	alias: {
		src: './src',
	},
	attw: {
		profile: 'esm-only',
	},
	dts: {
		vue: true,
	},
	entry: {
		index: './src',
	},
	exports: true,
	format: ['esm'],
	fromVite: true,
	ignoreWatch: ['node_modules', 'build', '__tests__'],
	outDir: './build',
	platform: 'neutral',
	plugins: [removePlugin({ consoleType: ['log', 'warn', 'debug', 'info'] })],
	publint: true,
	shims: true,
});
