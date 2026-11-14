import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  Play,
  Trash2,
  Upload,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { MathText } from '#/components/MathText'
import { useAppData } from '#/context/AppDataContext'
import {
  ELEMENTARY_FUNCTIONS,
  ELEMENTARY_FUNCTION_MAP,
  FUNCTION_CATEGORIES,
} from '#/data/elementaryFunctions'
import { parseImportJson } from '#/lib/storage'
import type { AppData } from '#/types/app'

export const Route = createFileRoute('/statistiky')({
  component: StatisticsAndBackupPage,
})

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function StatisticsAndBackupPage() {
  const { appData, exportData, importData, resetData, updateElementarySettings } =
    useAppData()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<{
    data: AppData
    filename: string
    exportedAt?: string
  } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const accuracy =
    appData.stats.totalAnswered > 0
      ? Math.round((appData.stats.totalCorrect / appData.stats.totalAnswered) * 100)
      : 0

  const functionRows = useMemo(() => {
    return ELEMENTARY_FUNCTIONS.map((fn) => {
      const st = appData.stats.functionStats[fn.id]
      const attempts = st?.attempts ?? 0
      const correct = st?.correct ?? 0
      const pct = attempts > 0 ? Math.round((correct / attempts) * 100) : null
      const avgSec =
        attempts > 0 && st ? (st.totalTimeMs / attempts / 1000).toFixed(1) : null
      return { fn, attempts, correct, pct, avgSec }
    }).sort((a, b) => {
      if (a.pct === null && b.pct === null) return 0
      if (a.pct === null) return 1
      if (b.pct === null) return -1
      return a.pct - b.pct
    })
  }, [appData.stats.functionStats])

  const weakIds = useMemo(() => {
    return functionRows
      .filter((r) => r.pct === null || r.pct < 80)
      .map((r) => r.fn.id)
  }, [functionRows])

  const handleFileSelected = async (file: File | null) => {
    setImportError(null)
    setImportSuccess(null)
    if (!file) return

    try {
      const text = await file.text()
      const parsed = parseImportJson(text)
      if (!parsed.ok) {
        setImportError(parsed.error)
        return
      }
      setPendingImport({
        data: parsed.data,
        filename: file.name,
        exportedAt: parsed.exportedAt,
      })
    } catch {
      setImportError('Nepodařilo se načíst obsah vybraného souboru.')
    }
  }

  const applyImport = (mode: 'merge' | 'replace') => {
    if (!pendingImport) return
    importData(pendingImport.data, mode)
    setImportSuccess(
      mode === 'merge'
        ? `Data ze souboru "${pendingImport.filename}" byla sloučena se stávajícím postupem.`
        : `Data byla plně obnovena ze souboru "${pendingImport.filename}".`,
    )
    setPendingImport(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePracticeWeak = () => {
    const targetIds = weakIds.length > 0 ? weakIds : ELEMENTARY_FUNCTIONS.map((f) => f.id)
    const cats = Array.from(
      new Set(
        ELEMENTARY_FUNCTIONS.filter((f) => targetIds.includes(f.id)).map((f) => f.category),
      ),
    )
    updateElementarySettings({
      enabledCategories: cats,
      enabledFunctionIds: targetIds,
    })
    navigate({ to: '/elementarni-funkce' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Statistiky a správa záloh
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Všechna data jsou uložena lokálně v localStorage. Můžeš je kdykoli stáhnout jako JSON soubor a nahrát na jiném zařízení.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePracticeWeak}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Procvičit slabé funkce ({weakIds.length})</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Celkem odpovědí</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
            {appData.stats.totalAnswered}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Úspěšnost</div>
          <div className="mt-1 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {appData.stats.totalAnswered > 0 ? `${accuracy}%` : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Dokončených sad</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
            {appData.stats.totalSessions}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Nejdelší série</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {appData.stats.bestStreak}
          </div>
        </div>
        <div className="col-span-2 lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Čas procvičování</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatDuration(appData.stats.totalTimeMs)}
          </div>
        </div>
      </div>

      {/* Backup Export & Import */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileJson className="w-5 h-5 text-indigo-500" />
              <span>Záloha dat (Stáhnout / Nahrát JSON)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Obsahuje veškeré výsledky testů, úspěšnost u jednotlivých funkcí i tvoje uložené předvolby.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 flex flex-col justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Exportovat aktuální stav
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Stáhne soubor <code className="font-mono">.json</code> do tvého počítače.
              </p>
            </div>
            <button
              type="button"
              onClick={() => exportData()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Stáhnout výsledky a nastavení (.json)</span>
            </button>
          </div>

          {/* Import */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files.item(0)
              void handleFileSelected(file)
            }}
            className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 p-4 flex flex-col justify-between gap-4"
          >
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Nahrát zálohu ze souboru
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Vyber soubor <code className="font-mono">.json</code> nebo ho sem přetáhni myší. Před uložením si vybereš sloučení nebo přepsání.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => void handleFileSelected(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Vybrat JSON zálohu…</span>
              </button>
            </div>
          </div>
        </div>

        {importError && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {importSuccess && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importSuccess}</span>
          </div>
        )}

        {pendingImport && (
          <div className="rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 p-4 space-y-3">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Náhled nahrávané zálohy: {pendingImport.filename}
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 flex flex-wrap gap-4">
              <span>
                Odpovědí: <strong>{pendingImport.data.stats.totalAnswered}</strong>
              </span>
              <span>
                Dokončených sad: <strong>{pendingImport.data.stats.sessions.length}</strong>
              </span>
              <span>
                Prozkoušených funkcí:{' '}
                <strong>{Object.keys(pendingImport.data.stats.functionStats).length}</strong>
              </span>
              {pendingImport.exportedAt && (
                <span>
                  Vytvořeno:{' '}
                  <strong>{new Date(pendingImport.exportedAt).toLocaleString('cs-CZ')}</strong>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => applyImport('merge')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
              >
                Sloučit se stávajícími daty
              </button>
              <button
                type="button"
                onClick={() => applyImport('replace')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                Nahradit vše ze zálohy
              </button>
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
              >
                Zrušit
              </button>
            </div>
          </div>
        )}

        {/* Reset zone */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Chceš začít s čistým štítem? Nastavení zůstane zachováno.
          </span>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vynulovat statistiky</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Opravdu smazat všechny výsledky?
              </span>
              <button
                type="button"
                onClick={() => {
                  resetData()
                  setConfirmReset(false)
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
              >
                Ano, smazat
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
              >
                Zrušit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mastery per function */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Úspěšnost podle funkcí (seřazeno od nejslabších)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {functionRows.map(({ fn, attempts, correct, pct, avgSec }) => {
            const cat = FUNCTION_CATEGORIES.find((c) => c.id === fn.category)
            return (
              <div
                key={fn.id}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {fn.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <MathText latex={fn.formulaLatex.replace(/\\quad.*/, '')} />
                      <span>• {cat?.shortLabel}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-extrabold ${
                        pct === null
                          ? 'text-slate-400'
                          : pct >= 80
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : pct >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {pct !== null ? `${pct}%` : 'Nezkoušeno'}
                    </div>
                    {attempts > 0 && (
                      <div className="text-[11px] text-slate-500">
                        {correct}/{attempts} • {avgSec}s/ot.
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      pct === null
                        ? 'bg-transparent'
                        : pct >= 80
                          ? 'bg-emerald-500'
                          : pct >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                    }`}
                    style={{ width: `${pct ?? 0}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Session history */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Historie dokončených testů ({appData.stats.sessions.length})
        </h2>

        {appData.stats.sessions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Zatím nemáš žádnou dokončenou sadu. Spusť poznávačku a výsledky se sem automaticky uloží.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {appData.stats.sessions.slice(0, 25).map((sess) => {
              const sPct =
                sess.totalQuestions > 0
                  ? Math.round((sess.correctCount / sess.totalQuestions) * 100)
                  : 0
              const wrongFns = sess.results
                .filter((r) => !r.isCorrect)
                .map((r) => ELEMENTARY_FUNCTION_MAP[r.functionId]?.name)
                .filter((name): name is string => Boolean(name))

              return (
                <div
                  key={sess.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {new Date(sess.finishedAt).toLocaleString('cs-CZ')} •{' '}
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {sess.promptFacet} ➔ {sess.answerFacet}
                      </span>{' '}
                      <span className="text-xs font-normal text-slate-500">({sess.mode})</span>
                    </div>
                    {wrongFns.length > 0 && (
                      <div className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                        Chyby: {Array.from(new Set(wrongFns)).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500">
                      {formatDuration(sess.durationMs)}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        sPct >= 80
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : sPct >= 50
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {sess.correctCount}/{sess.totalQuestions} ({sPct}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
