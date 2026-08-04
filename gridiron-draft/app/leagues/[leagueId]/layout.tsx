import LeagueTabs from "@/components/LeagueTabs";

export default function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { leagueId: string };
}) {
  return (
    <div>
      <LeagueTabs leagueId={params.leagueId} />
      {children}
    </div>
  );
}
