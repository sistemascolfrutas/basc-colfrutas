import { redirect } from "next/navigation";

import { isAuthorizedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAuthorizedUser(user)) {
    redirect("/");
  }

  if (user) {
    await supabase.auth.signOut();
  }

  const params = await searchParams;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(180deg,_#f6faf7_0%,_#edf5f1_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 md:px-10">
        <section className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-emerald-800">
              COLFRUTAS BASC
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Acceso restringido
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Ingresa con tu cuenta autorizada de Supabase para acceder al sistema
              de trazabilidad BASC y a los formularios operativos.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <InfoCard
                title="Sesiones seguras"
                description="La sesion se valida en servidor antes de mostrar rutas internas."
              />
              <InfoCard
                title="Acceso controlado"
                description="Solo usuarios autenticados y autorizados pueden entrar."
              />
              <InfoCard
                title="Proteccion persistente"
                description="La app refresca el token y mantiene protegidas las paginas internas."
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">
                Inicio de sesion
              </span>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Acceder a la plataforma
              </h2>
            </div>

            <form className="mt-6 space-y-4">
              <Field
                label="Correo"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="usuario@colfrutas.com"
              />
              <Field
                label="Contrasena"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Tu contrasena"
              />

              {params.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {params.error}
                </div>
              ) : null}

              <button
                formAction={login}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Ingresar
              </button>
            </form>

            <p className="mt-4 text-xs leading-6 text-slate-500">
              Las cuentas se administran en Supabase Auth. Si no puedes ingresar,
              solicita autorizacion al administrador del sistema.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        placeholder={placeholder}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
      />
    </label>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}
