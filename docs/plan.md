# Startup plan — 1 Nov 2026

## The pattern worth copying

Postiz (open-source Buffer/Hootsuite) was one developer on a plateau in mid-2025. In 2026 it added an agent-facing
identity (a CLI and an MCP server, so AI agents can schedule posts) and went from about $13K to $110K+ a month in
roughly six months, reported at $2M ARR by July 2026 (Starter Story, ARR Club; unaudited). The formula:

1. pick a SaaS category where small businesses pay $25–100 a month for something simple;
2. ship an open-source, self-hostable version (trust, free distribution through GitHub);
3. make it **agent-native**: a REST API, a CLI and an MCP server, so Claude/ChatGPT/agents can drive it;
4. charge for the hosted cloud version.

## Ten options, scored

Scores out of 5. *Buildable* = we can build and run the whole product with no third-party approval (API reviews,
app-store review, GPU budget). *Gap* = how open the open-source side of the market is.

| # | Idea | Paid incumbents (price) | Demand | Gap | Buildable | Fit with Swipe and Scale | Total |
|---|---|---|---|---|---|---|---|
| 1 | **Open-source testimonial wall + widgets + MCP** | Senja ($29–59/mo), Testimonial.to ($25–50/mo), Shapo, Famewall | 4 | **5** (no open-source option found) | **5** | **5** (every client site needs social proof) | **19** |
| 2 | AI review-reply / reputation manager for local businesses | Birdeye, Podium ($299+/mo) | 5 | 4 | 2 (Google Business Profile API needs approval) | 5 | 16 |
| 3 | Client portal for small agencies | Copilot, SuperOkay ($39+/mo) | 4 | 4 | 3 (large scope) | 4 | 15 |
| 4 | Waitlist + referral launch pages | Viral Loops, GetWaitlist ($35+/mo) | 3 | 4 | 5 | 3 | 15 |
| 5 | Proposal + quote builder for freelancers | Better Proposals, PandaDoc ($19–49/mo) | 4 | 3 (Documenso covers signing) | 4 | 4 | 15 |
| 6 | Feedback board + public roadmap | Canny ($79+/mo), Featurebase | 4 | 2 (Fider exists) | 5 | 2 | 13 |
| 7 | Link-in-bio + mini storefront | Linktree, Beacons | 5 | 1 (LinkStack, many clones) | 5 | 2 | 13 |
| 8 | Status page + uptime | Atlassian Statuspage, Better Stack | 4 | 1 (Uptime Kuma, OpenStatus) | 5 | 2 | 12 |
| 9 | Newsletter platform | Beehiiv, ConvertKit | 5 | 2 (Listmonk, Ghost) | 2 (deliverability, IP warm-up) | 2 | 11 |
| 10 | Long video → Shorts repurposing | Opus Clip ($15–29/mo) | 5 | 3 | 1 (GPU cost) | 2 | 11 |

## The pick: Laudwall (working name)

**One line:** collect testimonials with a link, approve them in an inbox, and embed them anywhere — open source,
self-hostable, and usable by AI agents through an API and an MCP server.

**Why I am 100% sure I can build it:** it needs nothing outside our control. No platform approvals, no paid AI
models, no GPUs. A web app, a database, an embeddable script and an MCP server: all things this machine already builds.

**Why it can sell:**
- every small-business website needs social proof, and the incumbents charge $25–59 a month for a form and a widget;
- no open-source testimonial tool showed up in the market scan (alternatives listed are all paid or freemium);
- the agent angle is new in this category: "Claude, put our five best reviews on the pricing page" works when the
  testimonials are reachable through MCP;
- built-in distribution: Swipe and Scale installs it on every client site, and every widget carries a small
  "Powered by Laudwall" link on the free tier.

**Customers:** small businesses and freelancers (collect + embed), agencies (many spaces, white label), developers
and AI agents (API + MCP).

**Business model:**
- open source (AGPL-3.0, like Postiz) and free to self-host;
- Cloud Free: 1 space, 15 testimonials, badge on widgets;
- Cloud Pro $12/mo: unlimited testimonials, 3 spaces, no badge, API + MCP;
- Cloud Agency $39/mo: unlimited spaces, white-label collect pages, client logins (later).

**Go-to-market:** launch on GitHub + Hacker News ("Show HN: open-source Senja"), list in awesome-oss-alternatives and
the MCP server directories, a Product Hunt launch, then Swipe and Scale clients as the first paying users. Content:
the @swipeand.scale Instagram shows a before/after of a site getting a wall of love.

## The team (roles, and who fills them now)

| Role | Owns | Filled by |
|---|---|---|
| Founder / CEO | approves launch, pricing, anything public | you |
| Product + strategy | this plan, scope, roadmap | Claude (this session) |
| Backend engineer | database, auth, REST API, rate limits | Claude |
| Frontend engineer | dashboard, collect page, wall, widget | Claude |
| Agent integrations | MCP server, API docs | Claude |
| QA | tests, real-browser checks | Claude (vitest + headless Chrome) |
| Growth | launch copy, directory listings | swipe-marketer agent, after you approve the launch |

Nothing is published, posted or launched without your approval.

## Build list (v1) — built 1 Nov 2026

- [x] Project scaffold: Next.js 15, TypeScript, SQLite via Node's built-in `node:sqlite` (zero native deps)
- [x] Database schema + migrations: users, sessions, spaces, testimonials, api_keys
- [x] Accounts: sign up, log in, log out (scrypt password hashes, httpOnly session cookies)
- [x] Spaces: create, edit (name, prompt question, thank-you text, accent colour), delete
- [x] Public collect page `/c/<space>`: name, role/company, rating, text, consent; honeypot + rate limit
- [x] Dashboard inbox: pending / approved / rejected tabs, approve, reject, feature, delete, import by hand
- [x] Hosted wall of love `/w/<space>`
- [x] Embeddable widget `/embed.js`: wall, carousel and badge layouts, no dependencies, shadow DOM
- [x] Public JSON feed `/api/public/<space>` with CORS
- [x] API keys (hashed) + REST API v1: spaces, list / create / update testimonials
- [x] MCP server (`mcp/`): list spaces, list/search testimonials, get embed code, collect link, approve
- [x] Landing page with pricing
- [x] Tests (vitest) for validation, auth, data access and the API
- [x] Dockerfile + docker-compose for self-hosting
- [x] README with self-host, API and MCP setup; AGPL licence
- [x] Real-browser check of every page

## Later (v2)

Video testimonials, import from Google/Trustpilot/X links, AI summary + best-quote highlighting, Stripe billing
for the cloud version, team members, custom domains, white label.

## Sources

Postiz growth: [Starter Story](https://www.starterstory.com/businesses/postiz/revenue),
[ARR Club](https://www.arr.club/postiz/postiz-reaches-80k-mrr),
[Superframeworks case study](https://superframeworks.com/case-study/postiz).
Testimonial market: [Senja on Testimonial.to alternatives](https://senja.io/blog/testimonial-to-alternatives),
[makerstack Senja review](https://makerstack.co/reviews/senja-review/),
[AppSumo testimonials.ltd](https://appsumo.com/products/testimonialsltd/).
