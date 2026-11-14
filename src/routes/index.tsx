import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  FunctionSquare,
  HardDrive,
  Play,
  Sparkles,
} from 'lucide-react'
import { MATH_MODULES } from '#/data/modules'
import { ELEMENTARY_FUNCTIONS } from '#/data/elementaryFunctions'
import { useAppData } from '#/context/AppDataContext'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { appData } = useAppData()
  const activeModule = MATH_MODULES.find((m) => m.status === 'active')!
  const plannedModules = MATH_MODULES.filter((m) => m.status === 'planned')

  const totalAnswered = appData.stats.totalAnswered
  const accuracy =
    totalAnswered > 0
      ? Math.round((appData.stats.totalCorrect / totalAnswered) * 100)
      : 0

  const practicedFunctionsCount = Object.values(appData.stats.functionStats).filter(
    (s) => Boolean(s && s.attempts > 0),
  ).length

  return (
    <div className="space-y-8">
      {/* Active Module Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs math-grid-bg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aktivní modul • 100% lokálně v prohlížeči</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {activeModule.title}
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeModule.description} Nastav si směr otázky i odpovědi (graf ⇄ předpis ⇄ název ⇄ vlastnosti), zapni jen konkrétní funkce a sleduj svůj pokrok.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/elementarni-funkce"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Spustit poznávačku</span>
              </Link>
              <Link
                to="/elementarni-funkce/atlas"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-sm transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Atlas všech {ELEMENTARY_FUNCTIONS.length} funkcí</span>
              </Link>
              <Link
                to="/statistiky"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-sm transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Statistiky & Záloha</span>
              </Link>
            </div>
          </div>

          {/* Local progress summary card */}
          <div className="lg:w-80 shrink-0 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tvůj lokální postup
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <HardDrive className="w-3.5 h-3.5" />
                localStorage
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Odpovědí</div>
                <div className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                  {totalAnswered}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Úspěšnost</div>
                <div className="mt-0.5 text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {totalAnswered > 0 ? `${accuracy}%` : '—'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Nejdelší série</div>
                <div className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                  {appData.stats.bestStreak}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Prozkoušeno</div>
                <div className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                  {practicedFunctionsCount}/{ELEMENTARY_FUNCTIONS.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planned Modules Grid */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Další okruhy učiva (připravená struktura)
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tyto moduly budeme postupně doplňovat — záloha dat už počítá s jejich budoucím obsahem.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plannedModules.map((mod) => (
            <Link
              key={mod.id}
              to="/pripravujeme/$moduleId"
              params={{ moduleId: mod.id }}
              className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <FunctionSquare className="w-4 h-4" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    Připravujeme
                  </span>
                </div>

                <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {mod.title}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>{mod.topics.length} plánovaných témat</span>
                <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Osnova <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
