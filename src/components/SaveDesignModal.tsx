"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { encodeDesign } from "@/lib/invoiceSerialization";
import type { DesignState } from "@/lib/invoiceSerialization";

type Props = {
  design: DesignState;
  onClose: () => void;
  nextPath?: string;
};

type Step = "idle" | "error";

export default function SaveDesignModal({ design, onClose, nextPath = "/customize" }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleOAuth = async (provider: "google" | "apple") => {
    const supabase = createClient();
    const encodedDesign = encodeDesign(design);
    const redirectTo = `${window.location.origin}/auth/callback?d=${encodeURIComponent(encodedDesign)}&next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      setErrorMsg(error.message);
      setStep("error");
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

  const oauthBtnBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "13px 20px",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: 0.2,
    border: "none",
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={card}>
        {step === "idle" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>
                Sign in to save your vote
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                One vote per email per season. You can update it anytime.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Google */}
              <button
                onClick={() => handleOAuth("google")}
                style={{
                  ...oauthBtnBase,
                  background: "#fff",
                  color: "#111",
                  border: "1px solid rgba(0,0,0,0.12)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>

              {/* Apple */}
              <button
                onClick={() => handleOAuth("apple")}
                style={{
                  ...oauthBtnBase,
                  background: "#000",
                  color: "#fff",
                }}
              >
                <svg width="17" height="18" viewBox="0 0 814 1000" fill="white">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-34.5-142.7-91.8c-43.1-66.2-81.7-173.2-81.7-274.8 0-193 130.3-295.2 258.1-295.2 66.2 0 121.5 43.4 162.9 43.4 39.5 0 101.7-46.4 177.8-46.4 28.6 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                </svg>
                Sign in with Apple
              </button>
            </div>

            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", alignSelf: "center" }}
            >
              Cancel
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
              onClick={() => setStep("idle")}
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
