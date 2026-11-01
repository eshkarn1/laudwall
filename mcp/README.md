# laudwall-mcp

MCP server for [Laudwall](https://github.com/eshkarn1/laudwall), the open-source testimonial wall. It lets AI agents
read, add, approve and embed your testimonials through Laudwall's REST API.

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

Create the API key in Laudwall under Settings. Tools: `list_spaces`, `list_testimonials`, `add_testimonial`,
`update_testimonial`, `delete_testimonial`, `get_embed_code`, `create_space`.

AGPL-3.0-only.
