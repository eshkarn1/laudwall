import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, deleteSession, userForSession, type User } from "./store";

const COOKIE = "lw_session";

export async function currentUser(): Promise<User | null> {
  return userForSession((await cookies()).get(COOKIE)?.value);
}

/** For dashboard pages and actions: the signed-in user, or off to the login page. */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function startSession(userId: number): Promise<void> {
  const { token, expires } = createSession(userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires, path: "/",
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) deleteSession(t);
  jar.delete(COOKIE);
}
