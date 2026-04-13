import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { generateManifest } from "./generate-manifest.js";

function manifestPlugin(): Plugin {
  return {
    name: "tile-buddy-manifest",
    async buildStart() {
      const { samples, tiles } = await generateManifest();
      console.log(`[manifest] ${samples} local samples, ${tiles} midjourney tiles`);
    },
    configureServer(server) {
      const dirs = ["public/samples", "midjourey"];
      for (const dir of dirs) {
        server.watcher.add(dir);
      }
      server.watcher.on("all", async (_event, path) => {
        if (!path.includes("public/samples") && !path.includes("midjourey")) return;
        const { samples, tiles } = await generateManifest();
        console.log(`[manifest] Regenerated — ${samples} local samples, ${tiles} midjourney tiles`);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    manifestPlugin(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    viteReact(),
  ],
});
