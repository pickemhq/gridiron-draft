import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminFeedbackPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();

  if (!profile?.is_admin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-display text-2xl uppercase text-chalk mb-2">Not authorized</p>
        <p className="text-chalk/50 text-sm">This page is only visible to admins.</p>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: feedback } = await admin
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl uppercase text-chalk mb-8">Feedback</h1>
      <div className="space-y-3">
        {(feedback ?? []).map((item) => (
          <div key={item.id} className="border border-field-700 bg-field-900/50 rounded-md p-4">
            <p className="text-chalk/90 whitespace-pre-wrap">{item.message}</p>
            <p className="text-xs text-chalk/40 mt-3 font-mono">
              {item.from_email ?? "anonymous"} ·{" "}
              {new Date(item.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        ))}
        {(!feedback || feedback.length === 0) && (
          <p className="text-chalk/40 text-sm">No feedback submitted yet.</p>
        )}
      </div>
    </div>
  );
}