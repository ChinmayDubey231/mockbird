import { cache } from "react";
import { prisma } from "./prisma";
import { currentUser } from "./auth";

/**
 * Loads a workspace by its public key, confirming the viewer owns it.
 * Wrapped in React's cache() so the layout's generateMetadata, a page's own
 * generateMetadata, and the page body itself — which all call this for the
 * same request — share one lookup instead of three.
 */
export const workspaceForViewer = cache(async (key: string) => {
  const user = await currentUser();
  if (!user) return null;
  const workspace = await prisma.workspace.findUnique({ where: { key } });
  if (!workspace || workspace.userId !== user.id) return null;
  return workspace;
});

export function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function mockUrl(key: string, path = ""): string {
  return `${appOrigin()}/m/${key}${path}`;
}
