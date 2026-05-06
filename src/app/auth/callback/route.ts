import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decodeDesign } from "@/lib/invoiceSerialization";
import { designFingerprint } from "@/lib/designFingerprint";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const encodedDesign = searchParams.get("d");
  const next = searchParams.get("next") ?? "/customize";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && encodedDesign) {
      const design = decodeDesign(encodedDesign);
      if (design) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
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
    }
  }

  return NextResponse.redirect(`${origin}${next}?saved=1`);
}
