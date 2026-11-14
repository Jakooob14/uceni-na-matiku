import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff, Play, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FunctionGraph } from '#/components/FunctionGraph'
import { MathText } from '#/components/MathText'
import { useAppData } from '#/context/AppDataContext'
import { ELEMENTARY_FUNCTIONS, FUNCTION_CATEGORIES } from '#/data/elementaryFunctions'
import type { FunctionCategory } from '#/types/app'

export const Route = createFileRoute('/elementarni-funkce/atlas')({
  component: FunctionsAtlasPage,
})

function FunctionsAtlasPage() {
  const { appData, updateElementarySettings } = useAppData()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<FunctionCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUniformScale, setShowUniformScale] = useState(false)
  const [showDetails, setShowDetails] = useState(true)

  const filteredFunctions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return ELEMENTARY_FUNCTIONS.filter((fn) => {
      if (selectedCategory !== 'all' && fn.category !== selectedCategory) return false
      if (!q) return true
      return (
        fn.name.toLowerCase().includes(q) ||
        fn.formulaLatex.toLowerCase().includes(q) ||
        fn.acceptedInputs.some((a) => a.toLowerCase().includes(q)) ||
        fn.studyTip.toLowerCase().includes(q)
      )
    })
  }, [selectedCategory, searchQuery])

  const handlePracticeSelection = () => {
    const ids = filteredFunctions.map((f) => f.id)
    const cats = Array.from(new Set(filteredFunctions.map((f) => f.category)))
    updateElementarySettings((prev) => ({
      ...prev,
      enabledCategories: cats,
      enabledFunctionIds: ids,
    }))
    navigate({ to: '/elementarni-funkce' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Atlas elementárních funkcí
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Přehled všech {ELEMENTARY_FUNCTIONS.length} funkcí, jejich grafů, definičních oborů, oborů hodnot, asymptot a studijních tipů.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePracticeSelection}
          disabled={filteredFunctions.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Procvičit zobrazené ({filteredFunctions.length})</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat funkci (např. arcsin, logaritmus, řetězovka...)"
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUniformScale((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                showUniformScale
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {showUniformScale ? 'Jednotné měřítko [−4.5, 4.5]' : 'Vlastní měřítko grafu'}
            </button>

            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {showDetails ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showDetails ? 'Skrýt popisky (samozkoušení)' : 'Zobrazit popisky'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Vše ({ELEMENTARY_FUNCTIONS.length})
          </button>
          {FUNCTION_CATEGORIES.map((cat) => {
            const count = ELEMENTARY_FUNCTIONS.filter((f) => f.category === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.shortLabel} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredFunctions.map((fn) => {
          const st = appData.stats.functionStats[fn.id]
          const pct = st && st.attempts > 0 ? Math.round((st.correct / st.attempts) * 100) : null
          const catMeta = FUNCTION_CATEGORIES.find((c) => c.id === fn.category)

          return (
            <article
              key={fn.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {catMeta?.label}
                  </span>
                  {showDetails ? (
                    <>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        {fn.name}
                      </h2>
                      <div className="mt-1 text-base text-slate-800 dark:text-slate-200">
                        <MathText latex={fn.formulaLatex} />
                      </div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm italic text-slate-400">
                      Popisky skryty — zkus funkci poznat z grafu
                    </div>
                  )}
                </div>

                {st && pct !== null && (
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      pct >= 80
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : pct >= 50
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                    title={`${st.correct} z ${st.attempts} správně`}
                  >
                    {pct}% ({st.correct}/{st.attempts})
                  </span>
                )}
              </div>

              <FunctionGraph
                fn={fn}
                display={{
                  showGrid: true,
                  showAxisLabels: true,
                  showAsymptotes: true,
                  showKeyPoints: true,
                  uniformViewport: showUniformScale,
                }}
                hidePointLabels={!showDetails}
                className="w-full h-auto border border-slate-200/80 dark:border-slate-800"
              />

              {showDetails && (
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                        Definiční obor D(f)
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        <MathText latex={fn.domainLatex} />
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                        Obor hodnot H(f)
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        <MathText latex={fn.rangeLatex} />
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                        Parita & periodicita
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {fn.parity}, {fn.periodicity}
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                        Omezenost
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {fn.boundedness}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200/70 dark:border-slate-800 space-y-1">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Monotonie: </span>
                      <span className="text-slate-800 dark:text-slate-200">{fn.monotonicity}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Asymptoty: </span>
                      <span className="text-slate-800 dark:text-slate-200">{fn.asymptotesSummary}</span>
                    </div>
                  </div>

                  <p className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-lg px-3 py-2 border border-indigo-100 dark:border-indigo-900/50">
                    💡 {fn.studyTip}
                  </p>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
