import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export function SuccessAnimation({
  show, message, onDone, duration = 1800,
}: { show: boolean; message?: string; onDone?: () => void; duration?: number }) {
  useEffect(() => {
    if (!show || !onDone) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [show, onDone, duration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-md"
          style={{ perspective: 1200 }}
        >
          <motion.div
            initial={{ scale: 0.4, rotateX: -90, opacity: 0 }}
            animate={{ scale: 1, rotateX: 0, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0, rotateX: 60 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="relative"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* glow rings */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute inset-0 rounded-full"
              style={{ background: "radial-gradient(circle, oklch(0.72 0.2 155 / 0.7), transparent 70%)" }}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0.7 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
              className="absolute inset-0 rounded-full"
              style={{ background: "radial-gradient(circle, oklch(0.78 0.16 75 / 0.5), transparent 70%)" }}
            />

            <div
              className="relative h-32 w-32 rounded-full grid place-items-center"
              style={{
                background: "conic-gradient(from 0deg, oklch(0.72 0.2 155), oklch(0.78 0.16 75), oklch(0.72 0.2 155))",
                boxShadow: "0 0 60px oklch(0.72 0.2 155 / 0.8), 0 0 120px oklch(0.78 0.16 75 / 0.5), inset 0 -8px 20px rgba(0,0,0,0.3), inset 0 8px 20px rgba(255,255,255,0.3)",
              }}
            >
              <div
                className="h-24 w-24 rounded-full bg-white/95 grid place-items-center"
                style={{ boxShadow: "inset 0 -6px 12px oklch(0.72 0.2 155 / 0.25), inset 0 6px 12px rgba(255,255,255,0.6)" }}
              >
                <svg viewBox="0 0 52 52" className="h-14 w-14">
                  <motion.path
                    d="M14 27 L23 36 L40 18"
                    fill="none"
                    stroke="oklch(0.45 0.12 160)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.25, duration: 0.55, ease: "easeOut" }}
                  />
                </svg>
              </div>
            </div>

            {/* sparkles */}
            {[...Array(8)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i / 8) * Math.PI * 2) * 90,
                  y: Math.sin((i / 8) * Math.PI * 2) * 90,
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.9, delay: 0.4 + i * 0.03 }}
                className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                style={{
                  background: i % 2 ? "oklch(0.78 0.16 75)" : "oklch(0.72 0.2 155)",
                  boxShadow: "0 0 12px currentColor",
                  color: i % 2 ? "oklch(0.78 0.16 75)" : "oklch(0.72 0.2 155)",
                }}
              />
            ))}

            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute left-1/2 top-full mt-6 -translate-x-1/2 whitespace-nowrap text-center text-white font-bold text-lg drop-shadow-[0_0_12px_oklch(0.72_0.2_155)]"
              >
                {message}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Browser helper: compress an image File to a small JPEG data URL. */
export async function fileToCompressedDataUrl(file: File, maxDim = 720, quality = 0.78): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("bad image"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}