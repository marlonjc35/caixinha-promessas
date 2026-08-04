/*
Node script to generate screenshots using Puppeteer.
Instructions:
 1. Serve the project locally (example: python -m http.server 5000)
 2. Install puppeteer: npm install puppeteer --save-dev
 3. Run: node generate-screenshots.js

The script captures the home, histórico and estatísticas views (adjust routes/selectors as needed).
*/

const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const outDir = "assets/screenshots";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  const base = process.env.BASE_URL || "http://localhost:5000";

  const entries = [
    { name: "screen-home", action: async () => {} },
    { name: "screen-history", action: async () => { await page.click('#btn-historico'); } },
    { name: "screen-stats", action: async () => { await page.click('#btn-stats'); } },
  ];

  for (const item of entries) {
    const url = new URL("/", base).href;
    console.log("Capturing", item.name, "at", url);
    await page.goto(url, { waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (item.action) {
      await item.action();
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    const file = `${outDir}/${item.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log("Saved", file);
  }

  await browser.close();
})();
