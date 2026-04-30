"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

const VIDEO_SRC = "/gif/Backpack-EasyCareEasyLife3.mp4";
// Hard cap: even if onEnded never fires (codec issues, autoplay block,
// network stall), the overlay will dismiss itself so the user is never
// trapped on a loading screen.
const MAX_INTRO_MS = 12_000;
const SMOOTH_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// Two clicks/taps within this window are treated as a "skip" gesture.
// 400ms matches the OS-level double-click threshold on macOS/iOS.
const DOUBLE_TAP_WINDOW_MS = 400;

// sessionStorage key — cleared when the browser tab/window closes, so the
// intro plays again on the user's next visit but never twice within a
// single browsing session even if they navigate away from the hero and
// come back.
const SESSION_FLAG = "intro_played";

export default function IntroVideo() {
  const t = useTranslations("intro");
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef(0);
  // Two-state design: `mounted` controls whether we render the overlay at
  // all (so repeat-visit users never see a flash), `visible` drives the
  // exit animation when it's time to dismiss.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleSkipTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_WINDOW_MS) {
      setVisible(false);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // First-mount session check. Runs once on the client after hydration; if
  // the flag is already set we never render the overlay. Setting the flag
  // up front (rather than after the video ends) means a mid-intro skip
  // still counts as "played" — preventing a replay if the user navigates
  // away and comes back within the session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_FLAG) === "1") return;
      sessionStorage.setItem(SESSION_FLAG, "1");
    } catch {
      // sessionStorage can throw in private-mode Safari or if disabled by
      // policy. Fall through and just play the intro this time.
    }
    // setState-in-effect is intentional here: we're synchronizing with an
    // external store (sessionStorage) that only exists post-hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setVisible(true);
  }, []);

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
    if (!mounted) return;
    const t = window.setTimeout(() => setVisible(false), MAX_INTRO_MS);
    return () => window.clearTimeout(t);
  }, [mounted]);

  // Some mobile browsers reject autoPlay attribute but allow .play() invoked
  // immediately after mount on a muted, playsInline element.
  useEffect(() => {
    if (!mounted) return;
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      setVisible(false);
    });
  }, [mounted]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={{ opacity: 0, filter: "blur(18px)", scale: 1.05 }}
          transition={{ duration: 1.8, ease: SMOOTH_EASE }}
          onClick={handleSkipTap}
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
            cursor: "pointer",
            // Disable double-tap zoom on iOS so the skip gesture lands
            // cleanly without triggering a viewport zoom.
            touchAction: "manipulation",
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.8, ease: SMOOTH_EASE }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              // Lift above the iOS home indicator so the hint isn't hidden
              // by the bottom safe-area chrome on iPhone.
              bottom: "calc(20px + env(safe-area-inset-bottom, 12px))",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: "rgba(0,0,0,0.55)",
                color: "rgba(255,255,255,0.92)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                padding: "8px 14px",
                borderRadius: 999,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              {t("skipHint")}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
