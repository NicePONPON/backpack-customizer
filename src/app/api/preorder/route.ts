import { NextResponse } from "next/server";
import { Resend } from "resend";

const OPS_RECIPIENT = "chrisliao1990@gmail.com";
const SANDBOX_FROM = "Backpack Customizer <onboarding@resend.dev>";
const PREORDER_CODE = "PREORDER10";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = { email?: string };

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const resend = new Resend(apiKey);

  try {
    // Send discount code to the customer
    await resend.emails.send({
      from: SANDBOX_FROM,
      to: OPS_RECIPIENT, // sandbox: route to ops until domain verified
      subject: `Your preorder discount code — ${PREORDER_CODE}`,
      html: `
        <p>Hi there,</p>
        <p>Thanks for preordering! When the season's winning design launches, use this code for <strong>10% off</strong>:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#111;">${PREORDER_CODE}</p>
        <p>We'll email you again when the bag is ready to order. Stay tuned.</p>
        <p style="color:#888;font-size:12px;">Preorder email: ${email}</p>
      `,
    });

    // Notify ops
    await resend.emails.send({
      from: SANDBOX_FROM,
      to: OPS_RECIPIENT,
      subject: `New preorder — ${email}`,
      html: `<p>New preorder interest from: <b>${email}</b></p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[preorder] send failed:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
