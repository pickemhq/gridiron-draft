import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { inviteCode, teamName } = await request.json();
  if (!inviteCode || !teamName) {
    return NextResponse.json({ error: "Invite code and team name are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: league, error: leagueError } = await admin
    .from("leagues")
    .select("id, max_members, draft_status")
    .eq("invite_code", inviteCode)
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: "No league found with that invite code" }, { status: 404 });
  }
  if (league.draft_status !== "not_started") {
    return NextResponse.json({ error: "This league's draft has already started" }, { status: 400 });
  }

  const { count } = await admin
    .from("league_members")
    .select("id", { count: "exact", head: true })
    .eq("league_id", league.id);

  if ((count ?? 0) >= league.max_members) {
    return NextResponse.json({ error: "This league is full" }, { status: 400 });
  }

  const { error: joinError } = await admin
    .from("league_members")
    .insert({ league_id: league.id, user_id: user.id, team_name: teamName, draft_position: (count ?? 0) + 1 });

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  return NextResponse.json({ leagueId: league.id });
}