import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://riomaru.jp",
  output: "static",
  integrations: [react()],
  build: { format: "file", inlineStylesheets: "never" },
  vite: { build: { sourcemap: false, assetsInlineLimit: 0 } },
});
