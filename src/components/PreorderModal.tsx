"use client";

import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "input" | "sent" | "error";

export default function PreorderModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) return;

    const res = await fetch("/api/preorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });

    if (res.ok) {
      setStep("sent");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg((data as { error?: string }).error ?? "Something went wrong.");
      setStep("error");
    }
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 300,
    background: "rgba(0,0,0,0.72)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 20px",
    backdropFilter: "blur(6px)",
  };

  const card: React.CSSProperties = {
    width: "100%", maxWidth: 420,
    background: "linear-gradient(135deg, rgba(30,20,10,0.98) 0%, rgba(20,14,0,0.98) 100%)",
    border: "1px solid rgba(255,215,100,0.25)",
    borderRadius: 20,
    padding: "32px 28px 28px",
    boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
    display: "flex", flexDirection: "column", gap: 20,
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={card}>
        {step === "input" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(255,215,100,0.7)" }}>
                Preorder
              </div>
              <h2 style={{ margin: 0, fontSize: "var(--fs-md)", fontWeight: 700, color: "#fff" }}>
                Lock in 10% off
              </h2>
              <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>
                Enter your email and we'll send your exclusive discount code. Use it when this style goes live.
              </p>
            </div>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  padding: "11px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,215,100,0.3)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: "var(--fs-md)",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: "rgba(255,215,100,0.9)",
                  color: "#222222",
                  fontSize: "var(--fs-md)",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: 0.3,
                }}
              >
                Send my discount code →
              </button>
            </form>

            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: "var(--fs-sm)", cursor: "pointer", alignSelf: "center" }}
            >
              Cancel
            </button>
          </>
        )}

        {step === "sent" && (
          <>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: "var(--fs-lg)" }}>✉️</div>
              <h2 style={{ margin: 0, fontSize: "var(--fs-md)", fontWeight: 700, color: "#fff" }}>Check your inbox</h2>
              <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                Your 10% preorder discount code is on its way to <strong style={{ color: "rgba(255,255,255,0.85)" }}>{email}</strong>.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ padding: "11px", borderRadius: 10, border: "1px solid rgba(255,215,100,0.3)", background: "transparent", color: "#fff", fontSize: "var(--fs-md)", cursor: "pointer" }}
            >
              Close
            </button>
          </>
        )}

        {step === "error" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: "var(--fs-md)", fontWeight: 700, color: "#fff" }}>Something went wrong</h2>
              <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "rgba(255,200,200,0.8)", lineHeight: 1.6 }}>{errorMsg}</p>
            </div>
            <button
              onClick={() => setStep("input")}
              style={{ padding: "11px", borderRadius: 10, border: "none", background: "rgba(255,215,100,0.9)", color: "#222222", fontSize: "var(--fs-md)", fontWeight: 700, cursor: "pointer" }}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
