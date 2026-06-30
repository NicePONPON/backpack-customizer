"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SALON_COPY from "@/app/salon/copy";

export default function SalonLoginPage() {
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/salon/admin")}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError("Sign-in failed. Please try again.");
  };

  return (
    <div style={{ maxWidth: 360, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "var(--fs-lg)", letterSpacing: "var(--ls-normal)" }}>{SALON_COPY.admin.title}</h1>
      <p style={{ fontSize: "var(--fs-md)", opacity: 0.7, marginTop: 8 }}>{SALON_COPY.admin.loginPrompt}</p>
      <button
        onClick={handleLogin}
        style={{ marginTop: 20, fontSize: "var(--fs-md)", padding: "12px 20px", borderRadius: 999, cursor: "pointer", border: "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)", background: "var(--foreground)", color: "var(--background)" }}
      >
        {SALON_COPY.admin.continueWithGoogle}
      </button>
      {error ? <p style={{ fontSize: "var(--fs-sm)", color: "#c0392b", marginTop: 12 }}>{error}</p> : null}
    </div>
  );
}
