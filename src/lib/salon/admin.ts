import { createClient } from "@/lib/supabase/server";

// Returns the signed-in user's email iff they are listed in salon_admins.
// Relies on the salon_admins RLS "self read" policy: a non-admin gets 0 rows.
export async function getCurrentAdminEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data, error } = await supabase
    .from("salon_admins")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (error || !data) return null;
  return data.email as string;
}
