import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { exec } from "node:child_process";

function manifestPlugin(): Plugin {
  function regenerate() {
    return new Promise<void>((resolve) => {
      exec("npx tsx generate-manifest.ts", (err, stdout, stderr) => {
        if (err) console.error("[manifest]", stderr);
        else if (stdout.trim()) console.log("[manifest]", stdout.trim());
        resolve();
      });
    });
  }

  return {
    name: "tile-buddy-manifest",
    configureServer(server) {
      const dirs = ["public/samples", "midjourey"];
      for (const dir of dirs) {
        server.watcher.add(dir);
      }
      server.watcher.on("all", async (_event, path) => {
        if (!path.includes("public/samples") && !path.includes("midjourey")) return;
        await regenerate();
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
