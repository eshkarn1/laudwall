"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type FormState = { error?: string; ok?: string; secret?: string } | undefined;

/** A form bound to a server action, showing its error or success message underneath. */
export function ActionForm({ action, children, className }: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, run] = useActionState(action, undefined);
  return (
    <form action={run} className={className}>
      {children}
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      {state?.ok && <p className="ok" role="status">{state.ok}</p>}
      {state?.secret && <pre aria-label="Your new key">{state.secret}</pre>}
    </form>
  );
}

export function Submit({ children, className = "btn primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? "Working…" : children}</button>;
}
