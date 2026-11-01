// A thin client for the Laudwall REST API. Every call carries your API key; errors come back as readable text.
export function client(baseUrl, apiKey, fetchImpl = fetch) {
  const base = String(baseUrl || "").replace(/\/$/, "");
  async function call(method, path, body) {
    const res = await fetchImpl(`${base}/api/v1${path}`, {
      method,
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 204) return { ok: true };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const details = (data.error?.details ?? []).map((d) => `${d.field}: ${d.message}`).join("; ");
      throw new Error(`${res.status} ${data.error?.message ?? res.statusText}${details ? ` (${details})` : ""}`);
    }
    return data;
  }
  const q = (params) => {
    const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
    return s.size ? `?${s}` : "";
  };
  const seg = encodeURIComponent;
  return {
    listSpaces: () => call("GET", "/spaces"),
    createSpace: (body) => call("POST", "/spaces", body),
    listTestimonials: ({ space, ...params }) => call("GET", `/spaces/${seg(space)}/testimonials${q(params)}`),
    addTestimonial: ({ space, ...body }) => call("POST", `/spaces/${seg(space)}/testimonials`, body),
    updateTestimonial: ({ id, ...body }) => call("PATCH", `/testimonials/${seg(id)}`, body),
    deleteTestimonial: ({ id }) => call("DELETE", `/testimonials/${seg(id)}`),
    embedCode: ({ space, layout }) => call("GET", `/spaces/${seg(space)}/embed${q({ layout })}`),
  };
}
