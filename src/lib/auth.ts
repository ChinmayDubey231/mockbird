import { cookies } from "next/headers";
import { prisma } from "./prisma";

/**
 * Identity.
 *
 * Everything above this file only ever asks for `currentUser()`. Today that is
 * a signed-out identity stored in a cookie, so the app is usable the moment it
 * starts with no OAuth application to register. Swapping in Auth.js with a
 * GitHub provider means replacing the body of `currentUser()` with a session
 * lookup — nothing else in the codebase knows how the user was identified.
 */

const COOKIE = "mockbird_uid";
const YEAR = 60 * 60 * 24 * 365;

export interface Identity {
  id: string;
  email: string;
  name: string | null;
}

/** Reads the identity without creating one. Safe in server components. */
export async function currentUser(): Promise<Identity | null> {
  const id = cookies().get(COOKIE)?.value;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? { id: user.id, email: user.email, name: user.name } : null;
}

/**
 * Reads the identity, creating one on first use. Only call this from route
 * handlers and server actions — server components cannot set cookies.
 */
export async function requireUser(): Promise<Identity> {
  const existing = await currentUser();
  if (existing) return existing;

  const user = await prisma.user.create({
    data: { email: `anon-${crypto.randomUUID()}@mockbird.local` },
  });
  cookies().set(COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: YEAR,
    path: "/",
  });
  return { id: user.id, email: user.email, name: user.name };
}

/** Throws a 404-shaped error rather than a 403, so IDs can't be probed. */
export class NotYours extends Error {
  constructor() {
    super("Not found");
  }
}

export async function ownedWorkspace(workspaceId: string) {
  const user = await currentUser();
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace || !user || workspace.userId !== user.id) throw new NotYours();
  return workspace;
}
