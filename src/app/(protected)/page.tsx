import Link from "next/link";

import { hasPermission } from "@/lib/app-users";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

const actions = [
  {
    href: "/fsu-01",
    title: "F-SU-01 Ingreso",
    description: "Registrar ingreso del vehiculo y cargar evidencias iniciales.",
    permission: "fsu01" as const,
  },
  {
    href: "/fsu-02",
    title: "F-SU-02 Inspeccion",
    description: "Registrar inspeccion fisica e inocuidad de la unidad de carga.",
    permission: "fsu02" as const,
  },
  {
    href: "/fsu-03",
    title: "F-SU-03 Cargue",
    description: "Registrar documento soporte, participantes y avance del cargue.",
    permission: "fsu03" as const,
  },
  {
    href: "/auditoria",
    title: "Auditoria",
    description: "Buscar operaciones por placa o fecha y revisar formularios y evidencias.",
    permission: "audit" as const,
  },
  {
    href: "/admin/usuarios",
    title: "Usuarios",
    description: "Crear usuarios, activar o desactivar accesos y asignar formularios.",
    permission: "user_admin" as const,
  },
  {
    href: "/admin/participantes-fsu03",
    title: "Participantes F-SU-03",
    description: "Crear, editar y eliminar las opciones de participantes del F-SU-03.",
    permission: "user_admin" as const,
  },
];

export default async function Home() {
  const { appUser } = await requireAuthorizedPageUser();
  const visibleActions = actions.filter((action) =>
    hasPermission(appUser, action.permission),
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f5f7f3_0%,_#eef6f0_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 md:py-14">
        <section className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-emerald-800">
            COLFRUTAS BASC
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Panel principal del sistema
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            Usa esta pantalla para entrar directamente al formulario que necesitas
            diligenciar o para consultar la auditoria de una operacion.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {visibleActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_55px_rgba(15,23,42,0.1)]"
            >
              <h2 className="text-xl font-semibold text-slate-950">{action.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {action.description}
              </p>
              <span className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                Abrir
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
