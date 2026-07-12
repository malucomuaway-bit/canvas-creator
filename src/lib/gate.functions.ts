import { createServerFn } from "@tanstack/react-start";
import { clearGateSession, getUnlockedState, unlockWithPassword } from "./gate.server";

export const checkUnlocked = createServerFn({ method: "GET" }).handler(() => getUnlockedState());

export const unlockSite = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    return unlockWithPassword(data.password);
  });

export const lockSite = createServerFn({ method: "POST" }).handler(() => clearGateSession());