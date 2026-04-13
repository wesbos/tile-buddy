import { readdir, writeFile } from "node:fs/promises";

const files = await readdir("./public/samples");
const samples = files
  .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
  .sort();

const code = `// Auto-generated — run \`pnpm generate\` to update
export const samples = ${JSON.stringify(samples, null, 2)};
`;

await writeFile("./src/samples.ts", code);
console.log(`Wrote ${samples.length} samples to src/samples.ts`);
