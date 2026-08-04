import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json();
  const { name, maxMembers, rosterSize, draftType, pickTimeLimitHours, teamName } = body;

  if (!name || !teamName) {
    return NextResponse.json({ error: "League name and team name are required" }, { status: 400 });
  }

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .insert({
      name,
      commissioner_id: user.id,
      max_members: maxMembers ?? 10,
      roster_size: rosterSize ?? 5,
      draft_type: draftType ?? "slow",
      pick_time_limit_hours: pickTimeLimitHours ?? 24,
    })
    .select()
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: leagueError?.message ?? "Failed to create league" }, { status: 500 });
  }

  const { error: memberError } = await supabase
    .from("league_members")
    .insert({ league_id: league.id, user_id: user.id, team_name: teamName, draft_position: 1 });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { error: draftStateError } = await supabase
    .from("draft_state")
    .insert({ league_id: league.id, current_pick_number: 1, current_round: 1, status: "not_started" });

  if (draftStateError) {
    return NextResponse.json({ error: draftStateError.message }, { status: 500 });
  }

  return NextResponse.json({ league });
}
