import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-field-700/60 bg-field-950/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-wide uppercase text-chalk">
          Gridiron<span className="text-clock-amber">Draft</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/leagues" className="text-chalk/80 hover:text-chalk transition-colors">
            My Leagues
          </Link>
          <Link
            href="/login"
            className="rounded-sm border border-brass/60 px-4 py-1.5 text-brass hover:bg-brass hover:text-field-950 transition-colors"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
