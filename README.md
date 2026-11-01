# Laudwall

The open-source testimonial wall. Collect testimonials with a link, approve them in one inbox, and embed them on any
website. Free to self-host, with a REST API and an MCP server, so AI agents can use it too.

- **Collect:** a public page per space (`/c/<space>`): text, rating, name, role, photo, video, consent. Spam honeypot and rate limits.
- **Approve:** waiting / approved / rejected inbox, feature the best ones, search, add testimonials you already have.
- **Show:** a hosted wall (`/w/<space>`) and an embeddable widget with three layouts: wall, carousel, star badge.
- **Automate:** REST API with revocable keys, `laudwall-mcp` for Claude and other MCP clients, webhooks for Slack, Zapier and n8n.
- **Move data:** CSV import and export per space.
- **Run a cloud:** optional plans (Free / Pro / Agency) with Stripe billing, off unless you turn it on.

## Run it

```bash
docker compose up -d          # http://localhost:3051, data in ./data/laudwall.db
```

Or without Docker (Node 22.13+; uses Node's built-in SQLite, so there is nothing native to compile):

```bash
pnpm install && pnpm build && pnpm start
```

| Variable | Default | What it does |
|---|---|---|
| `LAUDWALL_URL` | `http://localhost:3051` | Public address, used in collect links, embed code and API responses |
| `LAUDWALL_DB` | `data/laudwall.db` | SQLite file. Back it up and you have everything |
| `LAUDWALL_SIGNUPS` | on | `off` closes sign-ups once your account exists |
| `LAUDWALL_BRANDING` | on | `off` hides "Powered by Laudwall" on widgets |
| `LAUDWALL_UPLOADS` | `uploads/` next to the database | Where photos and videos are stored |
| `LAUDWALL_CLOUD` | off | `on` turns on plans and limits, for running Laudwall as a hosted service |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY` | unset | Cloud billing. Point a Stripe webhook at `/api/stripe/webhook` with `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted` |
| `LAUDWALL_ALLOW_PRIVATE_WEBHOOKS` | off | `on` lets webhooks reach private addresses (a self-hosted n8n on your LAN) |

### Plans (cloud mode only)

| | Free | Pro ($12/mo) | Agency ($39/mo) |
|---|---|---|---|
| Spaces | 1 | 3 | Unlimited |
| Testimonials | 15 | Unlimited | Unlimited |
| Photo and video | | Yes | Yes |
| Hide the badge | | Yes | Yes |
| API and MCP | | Yes | Yes |

A self-hosted server has every feature with no limits.

## Embed

```html
<div data-laudwall="your-space" data-layout="wall"></div>
<script src="https://your-laudwall.example/embed.js" async></script>
```

`data-layout` is `wall`, `carousel` or `badge`. `data-limit="6"` shows only the first six. Only approved
testimonials appear, featured first. The widget renders inside a shadow root, so it neither inherits nor breaks the
host page's CSS.

## REST API

Create a key under **API & MCP** and send it as `Authorization: Bearer lw_...`.

| Method | Path | Body / query |
|---|---|---|
| GET | `/api/v1/spaces` | |
| POST | `/api/v1/spaces` | `{name, slug, question?}` |
| GET | `/api/v1/spaces/:slug/testimonials` | `?status=approved&search=fast&limit=20` |
| POST | `/api/v1/spaces/:slug/testimonials` | `{author, body, role?, rating?, status?, source?}` |
| GET | `/api/v1/spaces/:slug/embed` | `?layout=wall\|carousel\|badge` |
| GET / PATCH / DELETE | `/api/v1/testimonials/:id` | PATCH: `{status?, featured?, author?, role?, body?}` |
| GET | `/api/public/:slug` | No key. Approved testimonials, CORS open (what the widget reads) |

Testimonials include `photo` and `video` URLs (or `null`). Errors are `{"error": {"message", "details"?}}` with a
matching status code: 401 bad key, 402 plan limit, 404, 409 slug taken, 429 rate limit (120 a minute per IP).

## Webhooks

Set a URL under a space's **Notifications and branding**. Every new testimonial is POSTed as JSON:
`{event: "testimonial.created", text, space, testimonial}`. `text` is ready for a Slack incoming webhook. HTTPS only,
5-second timeout, never retried; private addresses are refused unless `LAUDWALL_ALLOW_PRIVATE_WEBHOOKS=on`.

## MCP server

```json
{
  "mcpServers": {
    "laudwall": {
      "command": "npx",
      "args": ["-y", "laudwall-mcp"],
      "env": { "LAUDWALL_URL": "https://your-laudwall.example", "LAUDWALL_API_KEY": "lw_..." }
    }
  }
}
```

To run it from this repo instead, point `command` at `node` and `args` at `mcp/index.mjs` (run `pnpm install` in
`mcp/` first). Tools: `list_spaces`, `list_testimonials`, `add_testimonial`, `update_testimonial`,
`delete_testimonial`, `get_embed_code`, `create_space`.

## Develop

```bash
pnpm dev                       # http://localhost:3051
pnpm test                      # unit + API tests (in-memory database)
pnpm typecheck
# end to end in real Chrome, against a running build with a throwaway database:
LAUDWALL_DB=/tmp/lw-e2e.db pnpm start &
PUPPETEER_CORE=/path/to/node_modules/puppeteer-core node scripts/e2e.mjs /tmp/lw-shots
```

Layout: `src/lib` (database, validation, store, auth, widget), `src/app` (pages, server actions, API routes),
`mcp/` (the MCP server), `tests/`, `scripts/e2e.mjs`. Plan and roadmap: `docs/plan.md`.

## Licence

AGPL-3.0. Run it, change it, host it for yourself or your clients; if you offer a modified version as a service,
share your changes.
