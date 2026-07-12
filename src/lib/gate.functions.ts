import { createServerFn } from "@tanstack/react-start";
import { clearGateSession, getUnlockedState, unlockWithPassword } from "./gate.server";

export const checkUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await getUnlockedState();
  } catch (e) {
    console.error("[checkUnlocked] error:", e);
    throw e;
  }
});

export const unlockSite = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    return unlockWithPassword(data.password);
  });

export const lockSite = createServerFn({ method: "POST" }).handler(() => clearGateSession());