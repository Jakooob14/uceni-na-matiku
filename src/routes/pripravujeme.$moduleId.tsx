import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Clock, FunctionSquare } from 'lucide-react'
import { MATH_MODULES } from '#/data/modules'

export const Route = createFileRoute('/pripravujeme/$moduleId')({
  component: PlannedModulePage,
})

function PlannedModulePage() {
  const { moduleId } = Route.useParams()
  const mod = MATH_MODULES.find((m) => m.id === moduleId)

  if (!mod) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4">
        <h1 className="text-xl font-bold">Téma nenalezeno</h1>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na přehled
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="w-4 h-4" />
        Zpět na přehled učiva
      </Link>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            Připravovaný modul
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {mod.title}
          </h1>
          <p className="mt-2.5 text-slate-600 dark:text-slate-300 leading-relaxed">
            {mod.description}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Plánovaná témata v tomto modulu
          </h2>
          <ul className="space-y-2.5">
            {mod.topics.map((topic) => (
              <li
                key={topic}
                className="flex items-center gap-2.5 text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Zatím je aktivní modul Elementární funkce s plně nastavitelnou poznávačkou.
          </p>
          <Link
            to="/elementarni-funkce"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <FunctionSquare className="w-4 h-4" />
            Procvičit elementární funkce
          </Link>
        </div>
      </div>
    </div>
  )
}
