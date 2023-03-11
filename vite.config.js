import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			name: "handler",
			fileName: "index",
			formats: ["cjs"],
		},
		minify: false,
		target: "ES2021",
	},
});
