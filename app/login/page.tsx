"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";
import { Loader2, Lock } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Credenciales incorrectas. Revisa tu email y contraseña.");
      setLoading(false);
      return;
    }
    router.push(params.get("redirect") || "/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden bg-brand-dark lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,153,242,0.35),transparent_55%)]" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-blue/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-brand-gold/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo className="h-9 text-white" />
          <div>
            <h1 className="font-display text-4xl leading-tight">
              Inteligencia financiera
              <br />
              para la dirección.
            </h1>
            <p className="mt-4 max-w-md text-white/70">
              Ventas, compras, reservas, recuperables y trabajos — en un único panel
              premium, actualizado cada día.
            </p>
          </div>
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} Joyerías Te Quiero
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo className="h-8" />
          </div>
          <h2 className="font-display text-2xl text-slate-900">Acceso al panel</h2>
          <p className="mt-1 text-sm text-slate-500">
            Introduce tus credenciales corporativas.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@joyeriatequiero.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Entrar
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            ¿Sin acceso? Contacta con el administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
