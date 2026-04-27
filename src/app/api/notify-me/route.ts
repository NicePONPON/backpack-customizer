import { NextResponse } from "next/server";
import { Resend } from "resend";

// Same temp recipient as /api/send-invoice — the Resend account owner. Swap
// to anpeng.trading@gmail.com once a domain is verified for production.
const OPS_RECIPIENT = "chrisliao1990@gmail.com";
const SANDBOX_FROM = "Backpack Customizer <onboarding@resend.dev>";

// Permissive but stops the obvious garbage. Real validation is done by
// whoever opens the inbox.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = { email?: string };

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured on the server" },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from: SANDBOX_FROM,
      to: OPS_RECIPIENT,
      subject: `New 2026 Summer notify-me signup — ${email}`,
      html: `
        <p>A new signup for the 2026 Summer launch list:</p>
        <ul><li><b>Email:</b> ${email}</li></ul>
      `,
    });

    if (result.error) {
      console.error("[notify-me] Resend rejected:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify-me] unexpected error:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
