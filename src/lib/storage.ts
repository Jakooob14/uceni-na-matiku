import { ELEMENTARY_FUNCTIONS, FUNCTION_CATEGORIES } from '#/data/elementaryFunctions'
import type {
  AppData,
  AppPreferences,
  AppStats,
  ElementaryQuizSettings,
  ExportPayload,
  FunctionCategory,
  FunctionMasteryStats,
  QuizSessionRecord,
} from '#/types/app'

export const STORAGE_KEY = 'matikalab:app-data:v1'

export function createDefaultElementaryQuizSettings(): ElementaryQuizSettings {
  return {
    promptFacet: 'graph',
    answerFacet: 'formula',
    mode: 'choice',
    optionCount: 4,
    enabledCategories: FUNCTION_CATEGORIES.map((c) => c.id),
    enabledFunctionIds: ELEMENTARY_FUNCTIONS.map((f) => f.id),
    questionCount: 10,
    prioritizeWeak: true,
    immediateFeedback: true,
    timerMode: 'off',
    graphDisplay: {
      showGrid: true,
      showAxisLabels: true,
      showAsymptotes: true,
      showKeyPoints: true,
      uniformViewport: false,
    },
  }
}

export function createDefaultAppData(): AppData {
  return {
    version: 1,
    updatedAt: Date.now(),
    preferences: {
      theme: 'light',
      elementaryQuiz: createDefaultElementaryQuizSettings(),
    },
    stats: {
      totalSessions: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalTimeMs: 0,
      functionStats: {},
      sessions: [],
    },
    moduleData: {},
  }
}

const VALID_CATEGORIES = new Set<FunctionCategory>(FUNCTION_CATEGORIES.map((c) => c.id))
const VALID_FUNCTION_IDS = new Set<string>(ELEMENTARY_FUNCTIONS.map((f) => f.id))

export function sanitizeAppData(raw: unknown): AppData {
  const defaults = createDefaultAppData()
  if (!raw || typeof raw !== 'object') return defaults

  const obj = raw as Record<string, unknown>
  const rawPrefs = (obj.preferences ?? {}) as Record<string, unknown>
  const rawQuiz = (rawPrefs.elementaryQuiz ?? {}) as Record<string, unknown>
  const defaultQuiz = defaults.preferences.elementaryQuiz

  const enabledCategories = Array.isArray(rawQuiz.enabledCategories)
    ? rawQuiz.enabledCategories.filter(
        (c): c is FunctionCategory => typeof c === 'string' && VALID_CATEGORIES.has(c as FunctionCategory),
      )
    : defaultQuiz.enabledCategories

  const enabledFunctionIds = Array.isArray(rawQuiz.enabledFunctionIds)
    ? rawQuiz.enabledFunctionIds.filter(
        (id): id is string => typeof id === 'string' && VALID_FUNCTION_IDS.has(id),
      )
    : defaultQuiz.enabledFunctionIds

  const rawGraph = (rawQuiz.graphDisplay ?? {}) as Record<string, unknown>

  const preferences: AppPreferences = {
    theme: rawPrefs.theme === 'dark' ? 'dark' : 'light',
    elementaryQuiz: {
      promptFacet:
        typeof rawQuiz.promptFacet === 'string'
          ? (rawQuiz.promptFacet as ElementaryQuizSettings['promptFacet'])
          : defaultQuiz.promptFacet,
      answerFacet:
        typeof rawQuiz.answerFacet === 'string'
          ? (rawQuiz.answerFacet as ElementaryQuizSettings['answerFacet'])
          : defaultQuiz.answerFacet,
      mode:
        rawQuiz.mode === 'choice' || rawQuiz.mode === 'flashcard' || rawQuiz.mode === 'input'
          ? rawQuiz.mode
          : defaultQuiz.mode,
      optionCount:
        rawQuiz.optionCount === 2 ||
        rawQuiz.optionCount === 4 ||
        rawQuiz.optionCount === 6 ||
        rawQuiz.optionCount === 8
          ? rawQuiz.optionCount
          : defaultQuiz.optionCount,
      enabledCategories:
        enabledCategories.length > 0 ? enabledCategories : defaultQuiz.enabledCategories,
      enabledFunctionIds:
        enabledFunctionIds.length > 0 ? enabledFunctionIds : defaultQuiz.enabledFunctionIds,
      questionCount:
        rawQuiz.questionCount === 5 ||
        rawQuiz.questionCount === 10 ||
        rawQuiz.questionCount === 15 ||
        rawQuiz.questionCount === 20 ||
        rawQuiz.questionCount === 'all' ||
        rawQuiz.questionCount === 'infinite'
          ? rawQuiz.questionCount
          : defaultQuiz.questionCount,
      prioritizeWeak:
        typeof rawQuiz.prioritizeWeak === 'boolean'
          ? rawQuiz.prioritizeWeak
          : defaultQuiz.prioritizeWeak,
      immediateFeedback:
        typeof rawQuiz.immediateFeedback === 'boolean'
          ? rawQuiz.immediateFeedback
          : defaultQuiz.immediateFeedback,
      timerMode:
        rawQuiz.timerMode === 'off' ||
        rawQuiz.timerMode === 'stopwatch' ||
        rawQuiz.timerMode === 'countdown-15' ||
        rawQuiz.timerMode === 'countdown-30'
          ? rawQuiz.timerMode
          : defaultQuiz.timerMode,
      graphDisplay: {
        showGrid:
          typeof rawGraph.showGrid === 'boolean'
            ? rawGraph.showGrid
            : defaultQuiz.graphDisplay.showGrid,
        showAxisLabels:
          typeof rawGraph.showAxisLabels === 'boolean'
            ? rawGraph.showAxisLabels
            : defaultQuiz.graphDisplay.showAxisLabels,
        showAsymptotes:
          typeof rawGraph.showAsymptotes === 'boolean'
            ? rawGraph.showAsymptotes
            : defaultQuiz.graphDisplay.showAsymptotes,
        showKeyPoints:
          typeof rawGraph.showKeyPoints === 'boolean'
            ? rawGraph.showKeyPoints
            : defaultQuiz.graphDisplay.showKeyPoints,
        uniformViewport:
          typeof rawGraph.uniformViewport === 'boolean'
            ? rawGraph.uniformViewport
            : defaultQuiz.graphDisplay.uniformViewport,
      },
    },
  }

  const rawStats = (obj.stats ?? {}) as Record<string, unknown>
  const functionStats: Record<string, FunctionMasteryStats> = {}
  if (rawStats.functionStats && typeof rawStats.functionStats === 'object') {
    for (const [fnId, val] of Object.entries(rawStats.functionStats as Record<string, unknown>)) {
      if (!val || typeof val !== 'object') continue
      const s = val as Record<string, unknown>
      functionStats[fnId] = {
        attempts: typeof s.attempts === 'number' && s.attempts >= 0 ? s.attempts : 0,
        correct: typeof s.correct === 'number' && s.correct >= 0 ? s.correct : 0,
        streak: typeof s.streak === 'number' && s.streak >= 0 ? s.streak : 0,
        bestStreak: typeof s.bestStreak === 'number' && s.bestStreak >= 0 ? s.bestStreak : 0,
        lastSeenAt: typeof s.lastSeenAt === 'number' ? s.lastSeenAt : null,
        lastCorrectAt: typeof s.lastCorrectAt === 'number' ? s.lastCorrectAt : null,
        totalTimeMs: typeof s.totalTimeMs === 'number' && s.totalTimeMs >= 0 ? s.totalTimeMs : 0,
      }
    }
  }

  const sessions: QuizSessionRecord[] = Array.isArray(rawStats.sessions)
    ? rawStats.sessions.filter(
        (s): s is QuizSessionRecord =>
          Boolean(s) &&
          typeof s === 'object' &&
          typeof (s as QuizSessionRecord).id === 'string' &&
          typeof (s as QuizSessionRecord).finishedAt === 'number' &&
          Array.isArray((s as QuizSessionRecord).results),
      )
    : []

  const stats: AppStats = {
    totalSessions: typeof rawStats.totalSessions === 'number' ? rawStats.totalSessions : sessions.length,
    totalAnswered: typeof rawStats.totalAnswered === 'number' ? rawStats.totalAnswered : 0,
    totalCorrect: typeof rawStats.totalCorrect === 'number' ? rawStats.totalCorrect : 0,
    currentStreak: typeof rawStats.currentStreak === 'number' ? rawStats.currentStreak : 0,
    bestStreak: typeof rawStats.bestStreak === 'number' ? rawStats.bestStreak : 0,
    totalTimeMs: typeof rawStats.totalTimeMs === 'number' ? rawStats.totalTimeMs : 0,
    functionStats,
    sessions,
  }

  const moduleData =
    obj.moduleData && typeof obj.moduleData === 'object'
      ? (obj.moduleData as Record<string, unknown>)
      : {}

  return {
    version: 1,
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now(),
    preferences,
    stats,
    moduleData,
  }
}

export function loadAppData(): AppData {
  if (typeof window === 'undefined') return createDefaultAppData()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultAppData()
    return sanitizeAppData(JSON.parse(raw))
  } catch {
    return createDefaultAppData()
  }
}

export function saveAppData(data: AppData): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore quota errors gracefully
  }
}

export function createExportPayload(data: AppData): ExportPayload {
  return {
    app: 'uceni-na-matiku',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export function downloadBackupFile(data: AppData): string {
  const payload = createExportPayload(data)
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `matikalab-zaloha-${dateStr}.json`
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  return filename
}

export function parseImportJson(
  rawText: string,
): { ok: true; data: AppData; exportedAt?: string } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawText) as unknown
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'Soubor neobsahuje platný JSON objekt.' }
    }
    const obj = parsed as Record<string, unknown>

    // Support both wrapped ExportPayload and raw AppData
    if (obj.app === 'uceni-na-matiku' && obj.data && typeof obj.data === 'object') {
      return {
        ok: true,
        data: sanitizeAppData(obj.data),
        exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : undefined,
      }
    }

    if (obj.version === 1 && (obj.stats || obj.preferences)) {
      return {
        ok: true,
        data: sanitizeAppData(obj),
      }
    }

    return {
      ok: false,
      error: 'Neznámý formát zálohy. Nahrajte prosím JSON soubor vyexportovaný z této aplikace.',
    }
  } catch {
    return { ok: false, error: 'Soubor se nepodařilo přečíst jako platný JSON.' }
  }
}

export function mergeAppData(current: AppData, incoming: AppData): AppData {
  const mergedFnStats: Record<string, FunctionMasteryStats | undefined> = {
    ...current.stats.functionStats,
  }

  for (const [fnId, inc] of Object.entries(incoming.stats.functionStats)) {
    if (!inc) continue
    const cur = mergedFnStats[fnId]
    if (!cur) {
      mergedFnStats[fnId] = { ...inc }
    } else {
      mergedFnStats[fnId] = {
        attempts: cur.attempts + inc.attempts,
        correct: cur.correct + inc.correct,
        streak:
          (inc.lastSeenAt ?? 0) > (cur.lastSeenAt ?? 0) ? inc.streak : cur.streak,
        bestStreak: Math.max(cur.bestStreak, inc.bestStreak),
        lastSeenAt:
          cur.lastSeenAt && inc.lastSeenAt
            ? Math.max(cur.lastSeenAt, inc.lastSeenAt)
            : (cur.lastSeenAt ?? inc.lastSeenAt),
        lastCorrectAt:
          cur.lastCorrectAt && inc.lastCorrectAt
            ? Math.max(cur.lastCorrectAt, inc.lastCorrectAt)
            : (cur.lastCorrectAt ?? inc.lastCorrectAt),
        totalTimeMs: cur.totalTimeMs + inc.totalTimeMs,
      }
    }
  }

  const sessionMap = new Map<string, QuizSessionRecord>()
  for (const s of current.stats.sessions) sessionMap.set(s.id, s)
  for (const s of incoming.stats.sessions) sessionMap.set(s.id, s)
  const mergedSessions = Array.from(sessionMap.values()).sort(
    (a, b) => b.finishedAt - a.finishedAt,
  )

  const statValues = Object.values(mergedFnStats).filter(
    (s): s is FunctionMasteryStats => Boolean(s),
  )

  return {
    version: 1,
    updatedAt: Date.now(),
    preferences: current.preferences,
    stats: {
      totalSessions: mergedSessions.length,
      totalAnswered: statValues.reduce((acc, s) => acc + s.attempts, 0),
      totalCorrect: statValues.reduce((acc, s) => acc + s.correct, 0),
      currentStreak: current.stats.currentStreak,
      bestStreak: Math.max(current.stats.bestStreak, incoming.stats.bestStreak),
      totalTimeMs: current.stats.totalTimeMs + incoming.stats.totalTimeMs,
      functionStats: mergedFnStats,
      sessions: mergedSessions.slice(0, 200),
    },
    moduleData: {
      ...incoming.moduleData,
      ...current.moduleData,
    },
  }
}
