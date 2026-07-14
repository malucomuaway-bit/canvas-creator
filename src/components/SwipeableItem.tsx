import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Swipe da direita para a esquerda revela um botão de deletar.
 * Se o usuário puxar além de -80px, dispara onDelete.
 */
export function SwipeableItem({
  children,
  onDelete,
}: {
  children: ReactNode;
  onDelete: () => void;
}) {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-120, -40, 0], [1, 0.4, 0]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -80) {
      onDelete();
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.div
        style={{ opacity: bgOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end bg-destructive pr-6 text-destructive-foreground"
      >
        <Trash2 className="h-5 w-5" />
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -160, right: 0 }}
        dragElastic={0.15}
        style={{ x }}
        onDragEnd={onDragEnd}
        className="relative touch-pan-y bg-card"
      >
        {children}
      </motion.div>
    </div>
  );
}
