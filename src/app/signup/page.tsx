import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Header } from "@/components/bits";
import { currentUser } from "@/lib/auth";
import { signup } from "../actions";

export const metadata = { title: "Create an account" };

export default async function Signup() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <>
      <Header user={null} />
      <main className="narrow">
        <div className="panel">
          <h1>Create your account</h1>
          <p className="muted">Free. Your first testimonial link takes a minute.</p>
          <ActionForm action={signup} className="stack">
            <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" autoComplete="name" required maxLength={80} /></div>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
            <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} /><p className="muted small">At least 10 characters.</p></div>
            <Submit>Create account</Submit>
          </ActionForm>
          <p className="muted small" style={{ marginTop: 16 }}>Already have one? <Link href="/login">Log in</Link></p>
        </div>
      </main>
    </>
  );
}
