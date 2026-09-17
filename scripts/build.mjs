import { build } from "esbuild";
import { mkdir, cp, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });

await mkdir("dist/extension/popup", { recursive: true });

await build({
  entryPoints: {
    background: "extension/src/background/background.ts",
    content: "extension/src/content/content.ts",
    "page-interceptor": "extension/src/page/page-interceptor.ts",
    "popup/popup": "extension/popup/popup.ts"
  },
  outdir: "dist/extension",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  sourcemap: false
});

await cp("extension/manifest.json", "dist/extension/manifest.json");
await cp("extension/popup/index.html", "dist/extension/popup/index.html");
await cp("extension/popup/popup.css", "dist/extension/popup/popup.css");
await cp("extension/assets", "dist/extension/assets", { recursive: true });



