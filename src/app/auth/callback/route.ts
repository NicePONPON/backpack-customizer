import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { decodeDesign } from "@/lib/invoiceSerialization";
import { designFingerprint } from "@/lib/designFingerprint";

const OPS_RECIPIENT = "chrisliao1990@gmail.com";
const SANDBOX_FROM = "Backpack Customizer <onboarding@resend.dev>";
const CUSTOMIZE_CODE = "CUSTOMIZE10";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const encodedDesign = searchParams.get("d");
  const next = searchParams.get("next") ?? "/customize";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user && encodedDesign) {
        const design = decodeDesign(encodedDesign);
        if (design) {
          // Find the active season
          const { data: season } = await supabase
            .from("seasons")
            .select("id")
            .eq("is_active", true)
            .single();

          if (season) {
            // Upsert — user can update their submission during the season
            await supabase.from("design_submissions").upsert(
              {
                user_id: user.id,
                season_id: season.id,
                design_json: design,
                fingerprint: designFingerprint(design),
                submitted_at: new Date().toISOString(),
              },
              { onConflict: "user_id,season_id" }
            );
          }
        }
      }

      // Send 10% off coupon when signing in from the customize page
      if (user?.email && next.includes("/customize")) {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          const resend = new Resend(apiKey);
          await resend.emails.send({
            from: SANDBOX_FROM,
            to: OPS_RECIPIENT, // sandbox: route to ops until domain verified
            subject: `Your 10% off code — ${CUSTOMIZE_CODE}`,
            html: `
              <p>Hi there,</p>
              <p>Thanks for customizing your backpack! Here's <strong>10% off</strong> your order:</p>
              <p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#111;">${CUSTOMIZE_CODE}</p>
              <p>Apply this code at checkout when you're ready to order your custom bag.</p>
              <p style="color:#888;font-size:12px;">Sent to: ${user.email}</p>
            `,
          }).catch(() => {
            // Non-blocking: don't fail the redirect if email send fails
          });
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}?saved=1`);
}
