import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { message } = await request.json();
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Feedback message is required" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Feedback can come from a signed-out visitor too, and the feedback table
  // has no public read policy, so this needs the admin client to write.
  const admin = createAdminClient();
  const { error } = await admin
    .from("feedback")
    .insert({ message: message.trim(), from_email: user?.email ?? null });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}