"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/leagues");
    router.refresh();
  }

  return (
    <AuthCard title="Create your account" footerHref="/login" footerText="Already have an account? Sign in">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Team GM name" value={displayName} onChange={setDisplayName} type="text" />
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" />
        {error && <p className="text-clock-red text-sm">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-sm bg-clock-amber text-field-950 font-display uppercase tracking-wide py-3 hover:bg-brass transition-colors disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-widest text-chalk/50">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-field-950 border border-field-700 rounded-sm px-3 py-2 text-chalk focus:outline-none focus:border-clock-amber"
      />
    </label>
  );
}
