// End-to-end check against a running Laudwall (pnpm build && pnpm start), in real Chrome:
// sign up → create a space → a customer submits → approve + feature → API key → MCP server → widget on a foreign page.
//   node scripts/e2e.mjs [screenshot dir]
// Needs puppeteer-core (PUPPETEER_CORE=path/to/puppeteer-core) and Google Chrome. Use a throwaway LAUDWALL_DB.
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const BASE = process.env.LAUDWALL_URL ?? "http://localhost:3051";
const OUT = process.argv[2] ?? "e2e-shots";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const puppeteer = createRequire(import.meta.url)(process.env.PUPPETEER_CORE ?? "puppeteer-core");
mkdirSync(OUT, { recursive: true });

const stamp = Date.now().toString(36);
const email = `owner-${stamp}@example.com`;
const slug = `bakery-${stamp}`;
let step = 0;
const check = (ok, what) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  if (!ok) process.exitCode = 1;
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
page.on("pageerror", (e) => check(false, `page error: ${e.message}`));
const shot = async (name, p = page) => p.screenshot({ path: join(OUT, `${String(++step).padStart(2, "0")}-${name}.png`), fullPage: true });
const go = async (path) => page.goto(BASE + path, { waitUntil: "networkidle0" });
const submit = async (sel = "form button.primary") => Promise.all([page.waitForNetworkIdle({ idleTime: 300 }), page.click(sel)]);

try {
  await page.setViewport({ width: 1280, height: 900 });
  await go("/");
  await shot("landing");
  check((await page.$eval("h1", (h) => h.textContent)).includes("testimonial wall"), "landing page renders");

  await go("/signup");
  await page.type("#name", "Sam Owner");
  await page.type("#email", email);
  await page.type("#password", "correct horse battery");
  await Promise.all([page.waitForNavigation(), page.click("form button.primary")]);
  check(page.url().endsWith("/dashboard"), "sign up lands on the dashboard");

  await page.type("#name", "Maple Street Bakery");
  await page.type("#slug", slug);
  await Promise.all([page.waitForNavigation(), page.click("form button.primary")]);
  check(page.url().endsWith(`/dashboard/${slug}`), "creating a space opens its inbox");
  await shot("empty-inbox");

  // A customer, logged out, in a separate context
  const visitor = await browser.createBrowserContext();
  const cust = await visitor.newPage();
  await cust.setViewport({ width: 390, height: 844 });
  await cust.goto(`${BASE}/c/${slug}`, { waitUntil: "networkidle0" });
  await shot("collect-mobile", cust);
  await cust.type("#body", "The sourdough is the best in town and they made our wedding cake on two days' notice.");
  await cust.type("#author", "Priya Patel");
  await cust.type("#role", "Owner, Bloom Florals");
  await cust.click('input[name="consent"]');
  await Promise.all([cust.waitForSelector('[role="status"]'), cust.click("form button.primary")]);
  check((await cust.$eval('[role="status"]', (e) => e.textContent)).includes("Thank you"), "customer submission is thanked");
  await shot("collect-thanks", cust);
  await visitor.close();

  await go(`/dashboard/${slug}`);
  check((await page.content()).includes("Priya Patel"), "submission appears in the waiting tab");
  await shot("inbox-pending");
  await submit("article form button.primary"); // Approve
  await go(`/dashboard/${slug}?tab=approved`);
  check((await page.content()).includes("Priya Patel"), "approved testimonial moves to the approved tab");
  const feature = await page.$$("article form button");
  await Promise.all([page.waitForNetworkIdle({ idleTime: 300 }), feature[1].click()]); // Feature
  await go(`/dashboard/${slug}?tab=approved`);
  check((await page.content()).includes("★ Featured"), "featuring marks it");

  // Import one by hand
  await page.type("#i-body", "Friendly staff and the croissants sell out by 9 for a reason.");
  await page.type("#i-author", "Marcus Lee");
  await Promise.all([page.waitForSelector('[role="status"]'), page.click("aside form button.btn")]);
  check((await page.$eval('[role="status"]', (e) => e.textContent)).includes("Marcus"), "manual import is confirmed");
  await go(`/dashboard/${slug}?tab=approved`);
  await shot("inbox-approved");

  await go("/dashboard/settings");
  await page.type('input[name="name"]', "e2e");
  await Promise.all([page.waitForSelector('pre[aria-label="Your new key"]'), page.click("form button.primary")]);
  const key = (await page.$eval('pre[aria-label="Your new key"]', (e) => e.textContent)).trim();
  check(key.startsWith("lw_"), "API key is shown once");
  await shot("settings");

  await go(`/w/${slug}`);
  check((await page.content()).includes("Marcus Lee"), "hosted wall shows approved testimonials");
  await shot("wall");

  // The MCP server, driven by a real MCP client over stdio
  const { Client } = await import(pathToFileURL(join(process.cwd(), "mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js")).href);
  const { StdioClientTransport } = await import(pathToFileURL(join(process.cwd(), "mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js")).href);
  const mcp = new Client({ name: "e2e", version: "1" });
  await mcp.connect(new StdioClientTransport({ command: process.execPath, args: ["mcp/index.mjs"], env: { ...process.env, LAUDWALL_URL: BASE, LAUDWALL_API_KEY: key } }));
  const tools = (await mcp.listTools()).tools.map((t) => t.name);
  check(tools.length === 7 && tools.includes("get_embed_code"), `MCP lists ${tools.length} tools`);
  const text = async (name, args) => (await mcp.callTool({ name, arguments: args })).content[0].text;
  check(JSON.parse(await text("list_spaces", {})).spaces[0].slug === slug, "MCP list_spaces");
  const found = JSON.parse(await text("list_testimonials", { space: slug, search: "wedding" })).testimonials;
  check(found.length === 1 && found[0].author === "Priya Patel", "MCP list_testimonials search");
  const added = JSON.parse(await text("add_testimonial", { space: slug, author: "Agent Import", body: "Imported through the MCP server by an agent.", rating: 4 }));
  check(added.testimonial.status === "pending", "MCP add_testimonial lands as pending");
  const upd = JSON.parse(await text("update_testimonial", { id: added.testimonial.id, status: "approved" }));
  check(upd.testimonial.status === "approved", "MCP update_testimonial approves");
  const bad = await mcp.callTool({ name: "list_testimonials", arguments: { space: "no-such-space" } });
  check(bad.isError && bad.content[0].text.includes("404"), "MCP reports API errors to the agent");
  const html = JSON.parse(await text("get_embed_code", { space: slug, layout: "carousel" })).html;
  await mcp.close();

  // The widget on someone else's website (a different origin)
  const site = createServer((_, res) => {
    res.setHeader("content-type", "text/html");
    res.end(`<!doctype html><body style="font-family:Georgia;padding:24px;max-width:1000px"><h1>Maple Street Bakery</h1>
      <h2>Wall</h2><div data-laudwall="${slug}" data-layout="wall"></div><h2>Carousel</h2>${html}
      <h2>Badge</h2><div data-laudwall="${slug}" data-layout="badge"></div></body>`);
  }).listen(3999);
  await page.goto("http://localhost:3999", { waitUntil: "networkidle0" });
  const cards = await page.$$eval("[data-laudwall]", (els) => els.map((e) => e.shadowRoot?.querySelectorAll(".card").length ?? -1));
  check(cards[0] === 3 && cards[1] === 3, `widget renders on a foreign site (cards: ${cards.join(", ")})`);
  const badge = await page.$eval('[data-layout="badge"]', (e) => e.shadowRoot?.textContent ?? "");
  check(badge.includes("from 3 reviews"), "badge shows the average");
  await shot("widget-on-foreign-site");
  site.close();
} finally {
  await browser.close();
}
console.log(process.exitCode ? "\nSome checks failed." : "\nAll checks passed.");
