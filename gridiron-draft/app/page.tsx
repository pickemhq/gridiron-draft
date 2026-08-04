import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="field-lines">
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
        <div className="grid md:grid-cols-[1.1fr,0.9fr] gap-16 items-center">
          <div>
            <p className="font-mono text-xs tracking-[0.25em] text-brass uppercase mb-4">
              Week 0 — Preseason
            </p>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05] uppercase text-chalk">
              Draft the <span className="text-clock-amber">program</span>,
              <br />
              not the player.
            </h1>
            <p className="mt-6 text-chalk/70 text-lg max-w-md">
              Every real FBS team is on the board. Snake-draft it live, or run a slow
              draft where each GM gets a real deadline — and an email when the clock
              starts.
            </p>
            <div className="mt-9 flex items-center gap-4">
              <Link
                href="/signup"
                className="rounded-sm bg-clock-amber text-field-950 font-display uppercase tracking-wide px-6 py-3 hover:bg-brass transition-colors"
              >
                Start a league
              </Link>
              <Link href="/login" className="text-chalk/70 hover:text-chalk text-sm underline underline-offset-4">
                I have an invite code
              </Link>
            </div>
          </div>

          {/* Signature element: a mock "on the clock" draft ticker */}
          <div className="rounded-md border border-field-700 bg-field-900/80 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-field-700 px-5 py-3">
              <span className="font-mono text-xs uppercase tracking-widest text-chalk/60">
                Round 2 · Pick 7
              </span>
              <span className="flex items-center gap-2 font-mono text-xs text-clock-amber">
                <span className="h-1.5 w-1.5 rounded-full bg-clock-amber animate-pulse" />
                On the clock
              </span>
            </div>
            <div className="px-5 py-6">
              <p className="font-display text-2xl uppercase text-chalk">The Bad News Bears</p>
              <p className="text-sm text-chalk/50 mt-1">is on the clock</p>
              <div className="mt-6 scoreboard-digit text-5xl text-clock-amber tabular-nums">
                21<span className="text-2xl text-chalk/40">:44:09</span>
              </div>
              <p className="mt-1 text-xs text-chalk/40">until autopick</p>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {["Iowa State", "Miami", "Boise St."].map((t) => (
                  <div
                    key={t}
                    className="border border-field-700 rounded-sm px-2 py-3 text-center text-xs text-chalk/70 bg-field-950/40"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 grid sm:grid-cols-3 gap-8 border-t border-field-700 pt-12">
          <Feature
            eyebrow="Draft"
            title="Snake, or slow"
            body="Run it live in one sitting, or let it play out over days — everyone gets a real deadline and an email when they're up."
          />
          <Feature
            eyebrow="Score"
            title="Stats plus upset bonus"
            body="Weekly points from yardage, TDs, and turnover margin — plus a win bonus that scales with how much better your opponent was ranked."
          />
          <Feature
            eyebrow="Own it"
            title="Your data, your repo"
            body="Built on Next.js and Supabase. Fork it, host it, and it's yours — no lock-in."
          />
        </div>
      </section>
    </div>
  );
}

function Feature({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-mono text-xs tracking-[0.2em] text-brass uppercase">{eyebrow}</p>
      <h3 className="font-display text-xl uppercase mt-2 text-chalk">{title}</h3>
      <p className="text-sm text-chalk/60 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}
