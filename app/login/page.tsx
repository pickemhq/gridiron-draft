"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/leagues");
    router.refresh();
  }

  return (
    <AuthCard title="Sign in" footerHref="/signup" footerText="Need an account? Create one">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-mono uppercase tracking-widest text-chalk/50">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full bg-field-950 border border-field-700 rounded-sm px-3 py-2 text-chalk focus:outline-none focus:border-clock-amber"
          />
        </label>
        <label className="block">
          <span className="text-xs font-mono uppercase tracking-widest text-chalk/50">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full bg-field-950 border border-field-700 rounded-sm px-3 py-2 text-chalk focus:outline-none focus:border-clock-amber"
          />
        </label>
        {error && <p className="text-clock-red text-sm">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-sm bg-clock-amber text-field-950 font-display uppercase tracking-wide py-3 hover:bg-brass transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}
