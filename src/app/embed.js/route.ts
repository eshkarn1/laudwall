import { WIDGET_JS } from "@/lib/widget";

export function GET() {
  return new Response(WIDGET_JS, {
    headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" },
  });
}
