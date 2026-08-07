import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendFeedbackEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { message } = await request.json();
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Feedback message is required" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sent = await sendFeedbackEmail({ message: message.trim(), fromEmail: user?.email ?? null });
  if (!sent) {
    return NextResponse.json(
      { error: "Feedback email isn't configured yet — see FEEDBACK_EMAIL in the README" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}