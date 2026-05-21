import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function AdminFsu03ParticipantsPage() {
  await requireAuthorizedPageUser("user_admin");
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 md:px-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
        <span className="inline-flex rounded-full bg-slate-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-slate-600">
          Gestion suspendida
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          Participantes F-SU-03
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          La administracion de participantes esta suspendida porque el formulario
          F-SU-03 ahora permite escribirlos manualmente.
        </p>
      </section>
    </main>
  );
}
