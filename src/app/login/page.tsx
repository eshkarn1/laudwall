import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Header } from "@/components/bits";
import { currentUser } from "@/lib/auth";
import { login } from "../actions";

export const metadata = { title: "Log in" };

export default async function Login() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <>
      <Header user={null} />
      <main className="narrow">
        <div className="panel">
          <h1>Log in</h1>
          <ActionForm action={login} className="stack">
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
            <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
            <Submit>Log in</Submit>
          </ActionForm>
          <p className="muted small" style={{ marginTop: 16 }}>New here? <Link href="/signup">Create an account</Link></p>
        </div>
      </main>
    </>
  );
}
