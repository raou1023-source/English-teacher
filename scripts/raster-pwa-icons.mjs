import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = await readFile(join(root, "public/icon.svg"));

const sizes = [
  { size: 180, file: "icon-180.png" },
  { size: 192, file: "icon-192.png" },
  { size: 512, file: "icon-512.png" },
];

const html = (size) => `<!doctype html>
<html><head><style>
html,body{margin:0;width:${size}px;height:${size}px;background:#2c4a42}
img{width:${size}px;height:${size}px;display:block}
</style></head>
<body><img src="https://icon.local/icon.svg" alt=""></body></html>`;

const browser = await chromium.launch();
for (const { size, file } of sizes) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.route("https://icon.local/icon.svg", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: svg }),
  );
  await page.setContent(html(size), { waitUntil: "load" });
  await page.waitForTimeout(50);
  const buf = await page.screenshot({ type: "png" });
  await writeFile(join(root, "public", file), buf);
  await page.close();
  console.log("wrote", file, buf.length);
}
await browser.close();
