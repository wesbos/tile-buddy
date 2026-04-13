import { readdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

interface MjJob {
  id: string;
  parent_id: string;
  parent_grid: number;
  prompt: {
    tile: boolean;
    decodedPrompt: { content: string; weight: number }[];
  };
}

interface MjTile {
  id: string;
  prompt: string;
  url: string;
}

export async function generateManifest() {
  const files = await readdir("./public/samples");
  const samples = files
    .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
    .sort();

  const mjDir = "./midjourey";
  let mjFiles: string[] = [];
  try {
    mjFiles = (await readdir(mjDir)).filter((f) => f.endsWith(".ts")).sort();
  } catch {
    // no midjourney data
  }

  const mjTiles: MjTile[] = [];
  for (const file of mjFiles) {
    // Cache-bust so re-imports pick up changes
    const href = pathToFileURL(resolve(mjDir, file)).href + `?t=${Date.now()}`;
    const mod = await import(href);
    const raw = mod.default?.default ?? mod.default ?? mod;
    const jobs: MjJob[] = Array.isArray(raw) ? raw : [];
    for (const job of jobs) {
      if (!job.prompt?.tile) continue;
      const prompt = job.prompt.decodedPrompt?.[0]?.content ?? "";
      const grid = job.parent_grid ?? 0;
      const imageId = job.parent_id ?? job.id;
      mjTiles.push({
        id: job.id,
        prompt,
        url: `https://cdn.midjourney.com/${imageId}/0_${grid}_640_N.webp`,
      });
    }
  }

  const code = `// Auto-generated — do not edit by hand
export const samples = ${JSON.stringify(samples, null, 2)};

export const midjourneyTiles: { id: string; prompt: string; url: string }[] = ${JSON.stringify(mjTiles, null, 2)};
`;

  await writeFile("./src/samples.ts", code);
  return { samples: samples.length, tiles: mjTiles.length };
}

// Allow running directly: tsx generate-manifest.ts
const isDirectRun =
  process.argv[1]?.endsWith("generate-manifest.ts") ||
  process.argv[1]?.includes("generate-manifest");

if (isDirectRun) {
  const { samples, tiles } = await generateManifest();
  console.log(`Wrote ${samples} local samples and ${tiles} midjourney tiles to src/samples.ts`);
}
