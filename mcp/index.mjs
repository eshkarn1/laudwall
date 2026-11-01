#!/usr/bin/env node
// Laudwall MCP server (stdio). Needs LAUDWALL_URL and LAUDWALL_API_KEY (Laudwall → API & MCP → Create key).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { client } from "./client.mjs";

const url = process.env.LAUDWALL_URL ?? "http://localhost:3051";
const key = process.env.LAUDWALL_API_KEY;
if (!key) {
  console.error("Set LAUDWALL_API_KEY to a key from Laudwall → API & MCP.");
  process.exit(1);
}
const api = client(url, key);
const server = new McpServer({ name: "laudwall", version: "0.1.0" });

const space = z.string().describe("The space's slug, as shown by list_spaces (e.g. riverside-dental)");
const status = z.enum(["pending", "approved", "rejected"]);

/** Every tool returns JSON text, or the API's error as text with isError set, so the agent can correct itself. */
function tool(name, description, inputSchema, run, annotations = {}) {
  server.registerTool(name, { description, inputSchema, annotations }, async (args) => {
    try {
      return { content: [{ type: "text", text: JSON.stringify(await run(args), null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e.message ?? e) }], isError: true };
    }
  });
}

tool("list_spaces", "List your Laudwall spaces (one per business or product) with their collect link, wall link and testimonial counts.",
  {}, () => api.listSpaces(), { readOnlyHint: true });

tool("list_testimonials", "List or search a space's testimonials. Featured ones come first, then newest. Use status=approved for ones safe to publish.",
  { space, status: status.optional(), search: z.string().max(100).optional().describe("Words to find in the text, name or company"),
    limit: z.number().int().min(1).max(500).optional() },
  (a) => api.listTestimonials(a), { readOnlyHint: true });

tool("add_testimonial", "Add a testimonial you already have (from an email or a review). It lands as pending unless you set status. Only add real words from a real person, with their permission.",
  { space, author: z.string().min(1).max(80), body: z.string().min(10).max(2000), role: z.string().max(120).optional(),
    rating: z.number().int().min(1).max(5).optional(), status: status.optional(), source: z.string().max(40).optional() },
  (a) => api.addTestimonial(a));

tool("update_testimonial", "Approve, reject, feature or unfeature a testimonial, or fix a typo in it. Only approved testimonials appear on the website.",
  { id: z.number().int().positive(), status: status.optional(), featured: z.boolean().optional(),
    author: z.string().min(1).max(80).optional(), role: z.string().max(120).optional(), body: z.string().min(10).max(2000).optional() },
  (a) => api.updateTestimonial(a), { idempotentHint: true });

tool("delete_testimonial", "Delete a testimonial for good.", { id: z.number().int().positive() },
  (a) => api.deleteTestimonial(a), { destructiveHint: true });

tool("get_embed_code", "Get the HTML that shows a space's approved testimonials on any web page: a masonry wall, a carousel, or a star-rating badge.",
  { space, layout: z.enum(["wall", "carousel", "badge"]).optional() }, (a) => api.embedCode(a), { readOnlyHint: true });

tool("create_space", "Create a new space with its own collect link, inbox and widget.",
  { name: z.string().min(1).max(80), slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/).describe("Lowercase letters, numbers, dashes"),
    question: z.string().max(200).optional().describe("The question the collect page asks") },
  (a) => api.createSpace(a));

await server.connect(new StdioServerTransport());
