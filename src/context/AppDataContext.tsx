import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createDefaultAppData,
  downloadBackupFile,
  loadAppData,
  mergeAppData,
  saveAppData,
} from '#/lib/storage'
import type {
  AppData,
  ElementaryQuizSettings,
  QuizSessionRecord,
  SessionQuestionResult,
} from '#/types/app'

interface AppDataContextValue {
  appData: AppData
  updateElementarySettings: (
    updater:
      | Partial<ElementaryQuizSettings>
      | ((prev: ElementaryQuizSettings) => ElementaryQuizSettings),
  ) => void
  toggleTheme: () => void
  recordAnswer: (result: SessionQuestionResult) => void
  recordSession: (session: QuizSessionRecord) => void
  exportData: () => string
  importData: (incoming: AppData, mode: 'merge' | 'replace') => void
  resetData: () => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppData>(() => loadAppData())

  useEffect(() => {
    saveAppData(appData)
  }, [appData])

  useEffect(() => {
    const root = document.documentElement
    if (appData.preferences.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [appData.preferences.theme])

  const updateElementarySettings = useCallback(
    (
      updater:
        | Partial<ElementaryQuizSettings>
        | ((prev: ElementaryQuizSettings) => ElementaryQuizSettings),
    ) => {
      setAppData((prev) => {
        const current = prev.preferences.elementaryQuiz
        const nextSettings =
          typeof updater === 'function' ? updater(current) : { ...current, ...updater }
        return {
          ...prev,
          updatedAt: Date.now(),
          preferences: {
            ...prev.preferences,
            elementaryQuiz: nextSettings,
          },
        }
      })
    },
    [],
  )

  const toggleTheme = useCallback(() => {
    setAppData((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      preferences: {
        ...prev.preferences,
        theme: prev.preferences.theme === 'dark' ? 'light' : 'dark',
      },
    }))
  }, [])

  const recordAnswer = useCallback((result: SessionQuestionResult) => {
    setAppData((prev) => {
      const now = Date.now()
      const prevFn = prev.stats.functionStats[result.functionId] ?? {
        attempts: 0,
        correct: 0,
        streak: 0,
        bestStreak: 0,
        lastSeenAt: null,
        lastCorrectAt: null,
        totalTimeMs: 0,
      }

      const nextFnStreak = result.isCorrect ? prevFn.streak + 1 : 0
      const nextGlobalStreak = result.isCorrect ? prev.stats.currentStreak + 1 : 0

      return {
        ...prev,
        updatedAt: now,
        stats: {
          ...prev.stats,
          totalAnswered: prev.stats.totalAnswered + 1,
          totalCorrect: prev.stats.totalCorrect + (result.isCorrect ? 1 : 0),
          currentStreak: nextGlobalStreak,
          bestStreak: Math.max(prev.stats.bestStreak, nextGlobalStreak),
          totalTimeMs: prev.stats.totalTimeMs + result.timeMs,
          functionStats: {
            ...prev.stats.functionStats,
            [result.functionId]: {
              attempts: prevFn.attempts + 1,
              correct: prevFn.correct + (result.isCorrect ? 1 : 0),
              streak: nextFnStreak,
              bestStreak: Math.max(prevFn.bestStreak, nextFnStreak),
              lastSeenAt: now,
              lastCorrectAt: result.isCorrect ? now : prevFn.lastCorrectAt,
              totalTimeMs: prevFn.totalTimeMs + result.timeMs,
            },
          },
        },
      }
    })
  }, [])

  const recordSession = useCallback((session: QuizSessionRecord) => {
    setAppData((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      stats: {
        ...prev.stats,
        totalSessions: prev.stats.totalSessions + 1,
        sessions: [session, ...prev.stats.sessions].slice(0, 200),
      },
    }))
  }, [])

  const exportData = useCallback(() => {
    return downloadBackupFile(appData)
  }, [appData])

  const importData = useCallback((incoming: AppData, mode: 'merge' | 'replace') => {
    setAppData((prev) => {
      if (mode === 'replace') {
        return {
          ...incoming,
          updatedAt: Date.now(),
        }
      }
      return mergeAppData(prev, incoming)
    })
  }, [])

  const resetData = useCallback(() => {
    setAppData((prev) => {
      const fresh = createDefaultAppData()
      return {
        ...fresh,
        preferences: prev.preferences,
      }
    })
  }, [])

  return (
    <AppDataContext.Provider
      value={{
        appData,
        updateElementarySettings,
        toggleTheme,
        recordAnswer,
        recordSession,
        exportData,
        importData,
        resetData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) {
    throw new Error('useAppData must be used inside AppDataProvider')
  }
  return ctx
}
