"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { encodeDesign } from "@/lib/invoiceSerialization";
import type { DesignState } from "@/lib/invoiceSerialization";

type Props = {
  design: DesignState;
  onClose: () => void;
};

type Step = "input" | "sent" | "error";

export default function SaveDesignModal({ design, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const supabase = createClient();
    const encodedDesign = encodeDesign(design);
    const redirectTo = `${window.location.origin}/auth/callback?d=${encodeURIComponent(encodedDesign)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });

    if (error) {
      setErrorMsg(error.message);
      setStep("error");
    } else {
      setStep("sent");
    }
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 300,
    background: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 20px",
    backdropFilter: "blur(4px)",
  };

  const card: React.CSSProperties = {
    width: "100%", maxWidth: 420,
    background: "linear-gradient(135deg, rgba(30,30,30,0.98) 0%, rgba(20,20,20,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.14)",
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>
                Save your style
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                Enter your email — we'll send a link to confirm and save your design. One submission per season.
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
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: 14,
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
                  background: "#fff",
                  color: "#111",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: 0.3,
                }}
              >
                Send me the link →
              </button>
            </form>

            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", alignSelf: "center" }}
            >
              Cancel
            </button>
          </>
        )}

        {step === "sent" && (
          <>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 36 }}>✉️</div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>
                Check your inbox
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                We sent a confirmation link to <strong style={{ color: "rgba(255,255,255,0.85)" }}>{email}</strong>. Click it to save your design — the link expires in 1 hour.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#fff", fontSize: 14, cursor: "pointer" }}
            >
              Close
            </button>
          </>
        )}

        {step === "error" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>Something went wrong</h2>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,200,200,0.8)", lineHeight: 1.6 }}>{errorMsg}</p>
            </div>
            <button
              onClick={() => setStep("input")}
              style={{ padding: "11px", borderRadius: 10, border: "none", background: "#fff", color: "#111", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
