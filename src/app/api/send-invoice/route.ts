import { NextResponse } from "next/server";
import { Resend } from "resend";

// Operations inbox that receives a copy of every quotation a customer
// generates. Hardcoded — this is not a per-user setting.
// TEMP: routed to the Resend account owner while we're on the sandbox sender.
// Switch back to anpeng.trading@gmail.com once a domain is verified.
const OPS_RECIPIENT = "chrisliao1990@gmail.com";

// Resend's shared sandbox sender. No domain verification required, but
// recipients are restricted to the email address that owns the Resend
// account in sandbox mode. Swap to a verified domain sender for production.
const SANDBOX_FROM = "Backpack Customizer <onboarding@resend.dev>";

type Body = {
  pdfBase64?: string;
  invoiceNumber?: string;
  customerName?: string;
  customerCompany?: string;
};

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

  const { pdfBase64, invoiceNumber, customerName, customerCompany } = body;
  if (!pdfBase64) {
    return NextResponse.json(
      { error: "Missing pdfBase64" },
      { status: 400 },
    );
  }

  const resend = new Resend(apiKey);
  const filename = `${invoiceNumber || "invoice"}.pdf`;
  const who = customerCompany || customerName || "an unidentified customer";

  try {
    const result = await resend.emails.send({
      from: SANDBOX_FROM,
      to: OPS_RECIPIENT,
      subject: `New design quotation — ${invoiceNumber || "untitled"}`,
      html: `
        <p>A new backpack design quotation was generated.</p>
        <ul>
          <li><b>Invoice:</b> ${invoiceNumber || "—"}</li>
          <li><b>From:</b> ${who}</li>
        </ul>
        <p>The full PDF is attached.</p>
      `,
      attachments: [{ filename, content: pdfBase64 }],
    });

    if (result.error) {
      console.error("[send-invoice] Resend rejected:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-invoice] unexpected error:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
