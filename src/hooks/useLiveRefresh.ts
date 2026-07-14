import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Sincronização "quase realtime": refaz as queries a cada X segundos
 * enquanto a aba está visível, e imediatamente ao voltar o foco.
 * Simples, sem dependência de RLS relaxada nem canais websocket.
 */
export function useLiveRefresh(keys: string[][], intervalMs = 4000) {
  const qc = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    function invalidateAll() {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    }

    function start() {
      stop();
      timer = setInterval(invalidateAll, intervalMs);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    }

    function onVis() {
      if (document.visibilityState === "visible") {
        invalidateAll();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", invalidateAll);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", invalidateAll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);
}
