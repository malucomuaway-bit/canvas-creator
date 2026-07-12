import { redirect } from "@tanstack/react-router";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { unlocked?: boolean };

function getSessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET is not set");

  return {
    password,
    name: "casa-gate",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      partitioned: true,
      path: "/",
    },
  };
}

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export async function getUnlockedState() {
  const session = await useSession<GateSession>(getSessionConfig());
  return { unlocked: !!session.data.unlocked };
}

export async function requireUnlocked() {
  const session = await useSession<GateSession>(getSessionConfig());
  if (!session.data.unlocked) {
    throw redirect({ to: "/unlock" });
  }
  return session;
}

export async function unlockWithPassword(password: string) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) throw new Error("SITE_PASSWORD is not set");

  if (!passwordMatches(password, expected)) {
    return { ok: false as const };
  }

  const session = await useSession<GateSession>(getSessionConfig());
  await session.update({ unlocked: true });
  return { ok: true as const };
}

export async function clearGateSession() {
  const session = await useSession<GateSession>(getSessionConfig());
  await session.clear();
  return { ok: true as const };
}