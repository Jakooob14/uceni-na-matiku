import { Link, useRouterState } from '@tanstack/react-router'
import {
  BarChart3,
  BookOpen,
  Compass,
  Download,
  FunctionSquare,
  Moon,
  Sun,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useAppData } from '#/context/AppDataContext'

export function AppShell({ children }: { children: ReactNode }) {
  const { appData, toggleTheme, exportData } = useAppData()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [exportToast, setExportToast] = useState<string | null>(null)

  const handleQuickExport = () => {
    const filename = exportData()
    setExportToast(`Uloženo: ${filename}`)
    setTimeout(() => setExportToast(null), 3000)
  }

  const cleanPath = pathname.replace(/\/+$/, '') || '/'

  const navItems = [
    { to: '/', label: 'Přehled', icon: Compass },
    { to: '/elementarni-funkce', label: 'Poznávačka', icon: FunctionSquare },
    { to: '/elementarni-funkce/atlas', label: 'Atlas funkcí', icon: BookOpen },
    { to: '/statistiky', label: 'Statistiky & Záloha', icon: BarChart3 },
  ] as const

  const accuracy =
    appData.stats.totalAnswered > 0
      ? Math.round((appData.stats.totalCorrect / appData.stats.totalAnswered) * 100)
      : null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 dark:text-white"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold shadow-xs">
                ∫x
              </span>
              <span className="text-lg">MatikaLab</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = cleanPath === item.to
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {accuracy !== null && (
              <Link
                to="/statistiky"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                title="Celková úspěšnost z localStorage"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{accuracy}% úspěšnost</span>
                {appData.stats.currentStreak > 1 && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    • {appData.stats.currentStreak} v řadě
                  </span>
                )}
              </Link>
            )}

            <button
              type="button"
              onClick={handleQuickExport}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Stáhnout zálohu výsledků a nastavení (.json)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stáhnout zálohu</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Přepnout tmavý režim"
              title="Přepnout světlý / tmavý režim"
            >
              {appData.preferences.theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden border-t border-slate-200/70 dark:border-slate-800/70 px-3 py-1.5 flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = cleanPath === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </header>

      {exportToast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2.5 text-sm font-medium shadow-lg">
          {exportToast}
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200/70 dark:border-slate-800/70 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        MatikaLab • 100% lokální aplikace • Data a výsledky se ukládají do localStorage prohlížeče
      </footer>
    </div>
  )
}
