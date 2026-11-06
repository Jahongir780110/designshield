import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
    plugins: [vue(), viteSingleFile()],
    root: "./ui", // Source files live in plugin/ui
    build: {
        outDir: "../dist", // Output directly to plugin/dist
        emptyOutDir: false, // Don't wipe dist/code.js when compiling UI!
        target: "esnext",
        assetsInlineLimit: 100000000, // Inline all assets
        chunkSizeWarningLimit: 100000000,
    },
});