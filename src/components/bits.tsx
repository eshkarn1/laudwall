import Link from "next/link";
import { logout } from "@/app/actions";
import type { User } from "@/lib/store";

export function Stars({ n }: { n: number }) {
  return <span className="stars" aria-label={`${n} out of 5`}>{"★".repeat(n)}<i>{"★".repeat(5 - n)}</i></span>;
}

export function Header({ user }: { user: User | null }) {
  return (
    <header className="top">
      <div className="wrap">
        <Link href={user ? "/dashboard" : "/"} className="brand">Laudwall</Link>
        <nav>
          {user ? (
            <>
              <Link href="/dashboard">Spaces</Link>
              <Link href="/dashboard/settings">API &amp; MCP</Link>
              <form action={logout}><button className="btn small">Log out</button></form>
            </>
          ) : (
            <>
              <Link href="/#pricing">Pricing</Link>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="btn primary small">Start free</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
