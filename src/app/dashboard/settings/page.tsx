import { ActionForm, Submit } from "@/components/ActionForm";
import { appUrl } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listApiKeys } from "@/lib/store";
import { createKey, deleteKey } from "../../actions";

export const metadata = { title: "API & MCP" };

export default async function Settings() {
  const user = await requireUser();
  const keys = listApiKeys(user.id);
  const mcp = JSON.stringify({ mcpServers: { laudwall: { command: "npx", args: ["-y", "laudwall-mcp"], env: { LAUDWALL_URL: appUrl(), LAUDWALL_API_KEY: "lw_..." } } } }, null, 2);
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <h1>API &amp; MCP</h1>
      <p className="muted">Let your code, or an AI agent like Claude, read and manage your testimonials. Keys can do everything you can, so keep them secret.</p>
      <div className="panel">
        <h2>API keys</h2>
        {keys.length > 0 && (
          <table style={{ marginBottom: 16 }}>
            <thead><tr><th>Name</th><th>Key</th><th>Last used</th><th /></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td><td><code>{k.prefix}…</code></td><td className="muted">{k.last_used_at?.slice(0, 16) ?? "never"}</td>
                  <td><form action={deleteKey.bind(null, k.id)}><button className="btn small danger">Revoke</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <ActionForm action={createKey} className="row">
          <input name="name" placeholder="What is it for? (e.g. Claude Desktop)" maxLength={60} style={{ flex: 1, minWidth: 200 }} />
          <Submit>Create key</Submit>
        </ActionForm>
      </div>
      <div className="panel">
        <h2>Connect an AI agent (MCP)</h2>
        <p className="muted small">Add this to Claude Desktop, Claude Code or any MCP client, with your key. The agent can then list spaces, search testimonials, approve them and fetch embed code.</p>
        <pre>{mcp}</pre>
      </div>
      <div className="panel">
        <h2>REST API</h2>
        <p className="muted small">Send <code>Authorization: Bearer lw_...</code> with every request.</p>
        <pre>{`GET    ${appUrl()}/api/v1/spaces
POST   ${appUrl()}/api/v1/spaces                         {name, slug, question?}
GET    ${appUrl()}/api/v1/spaces/:slug/testimonials      ?status=approved&search=fast&limit=20
POST   ${appUrl()}/api/v1/spaces/:slug/testimonials      {author, body, role?, rating?, status?}
GET    ${appUrl()}/api/v1/spaces/:slug/embed             ?layout=wall|carousel|badge
GET    ${appUrl()}/api/v1/testimonials/:id
PATCH  ${appUrl()}/api/v1/testimonials/:id               {status?, featured?, author?, role?, body?}
DELETE ${appUrl()}/api/v1/testimonials/:id`}</pre>
      </div>
    </div>
  );
}
