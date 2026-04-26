"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const VIDEO_SRC = "/gif/Backpack-EasyCareEasyLife3.mp4";
// Hard cap: even if onEnded never fires (codec issues, autoplay block,
// network stall), the overlay will dismiss itself so the user is never
// trapped on a loading screen.
const MAX_INTRO_MS = 12_000;
const SMOOTH_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export default function IntroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(true);

  // Lock body scroll while the intro is on screen.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), MAX_INTRO_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Some mobile browsers reject autoPlay attribute but allow .play() invoked
  // immediately after mount on a muted, playsInline element.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      setVisible(false);
    });
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={{ opacity: 0, filter: "blur(18px)", scale: 1.05 }}
          transition={{ duration: 0.9, ease: SMOOTH_EASE }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            // Match the site's page background so the letterbox bars blend
            // seamlessly with what's underneath.
            background: "linear-gradient(#555555, #222222)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            willChange: "opacity, filter, transform",
          }}
          aria-hidden
        >
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => setVisible(false)}
            style={{
              // Fit by the narrow side without upscaling: width/height: auto
              // lets the video keep its intrinsic dimensions, while
              // maxWidth/Height: 100% lets it shrink to fit smaller viewports.
              // This keeps the video pixel-sharp on any screen — letterbox or
              // pillarbox bars fill the remaining space using the parent's
              // gradient background.
              width: "auto",
              height: "auto",
              maxWidth: "100%",
              maxHeight: "100%",
              display: "block",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
