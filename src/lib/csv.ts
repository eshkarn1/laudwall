// CSV in and out for testimonials: RFC 4180 quoting, a header row, and nothing a spreadsheet will misread as a formula.
import type { Testimonial } from "./store";

export const COLUMNS = ["author", "role", "body", "rating", "status", "featured", "source", "created_at"] as const;

function cell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // a leading = + - @ would run as a formula in Excel or Sheets
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Testimonial[]): string {
  return [COLUMNS.join(","), ...rows.map((t) => COLUMNS.map((c) => cell(c === "featured" ? (t.featured ? "yes" : "") : t[c])).join(","))].join("\r\n") + "\r\n";
}

/** Rows as objects keyed by the (lower-cased) header. Handles quoted commas, quotes and line breaks. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') (field += '"', i++);
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") (row.push(field), (field = ""));
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += c;
  }
  if (field || row.length) (row.push(field), rows.push(row));
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}
