import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowLeftRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Play,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Timer,
  X,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AnswerOptionContent,
  PromptContent,
  getQuestionInstruction,
} from '#/components/FacetContent'
import { FunctionGraph } from '#/components/FunctionGraph'
import { MathText } from '#/components/MathText'
import { useAppData } from '#/context/AppDataContext'
import {
  ELEMENTARY_FUNCTIONS,
  ELEMENTARY_FUNCTION_MAP,
  FUNCTION_CATEGORIES,
} from '#/data/elementaryFunctions'
import {
  ANSWER_FACET_OPTIONS,
  PROMPT_FACET_OPTIONS,
  buildQuestion,
  canSwapFacets,
  checkTextAnswer,
  getAnswerPlainLabel,
  getFilteredFunctions,
  pickWeightedFunction,
  shuffleArray,
  swapPromptAndAnswer,
} from '#/lib/elementaryQuizEngine'
import type { GeneratedQuestion, QuizOption } from '#/lib/elementaryQuizEngine'
import type {
  AnswerFacet,
  ElementaryFunction,
  ElementaryQuizSettings,
  FunctionCategory,
  PromptFacet,
  QuestionCountOption,
  QuizMode,
  SessionQuestionResult,
  TimerMode,
} from '#/types/app'

export const Route = createFileRoute('/elementarni-funkce/')({
  component: ElementaryFunctionsQuizPage,
})

type Phase = 'setup' | 'active' | 'summary'

const PRESETS: Array<{
  label: string
  promptFacet: PromptFacet
  answerFacet: AnswerFacet
  mode?: QuizMode
}> = [
  { label: 'Graf ➔ Předpis', promptFacet: 'graph', answerFacet: 'formula' },
  { label: 'Předpis ➔ Graf', promptFacet: 'formula', answerFacet: 'graph' },
  { label: 'Graf ➔ Název', promptFacet: 'graph', answerFacet: 'name' },
  { label: 'Předpis ➔ D(f)', promptFacet: 'formula', answerFacet: 'domain' },
  { label: 'Předpis ➔ H(f)', promptFacet: 'formula', answerFacet: 'range' },
  { label: 'Vlastnosti ➔ Předpis', promptFacet: 'properties', answerFacet: 'formula' },
  { label: 'Mix všeho', promptFacet: 'random', answerFacet: 'random' },
]

const QUICK_MATH_CHIPS = [
  'x^2',
  'x^3',
  '1/x',
  '1/x^2',
  'sqrt(x)',
  'cbrt(x)',
  '|x|',
  'sgn(x)',
  'e^x',
  '(1/2)^x',
  'ln x',
  'sin x',
  'cos x',
  'tg x',
  'cotg x',
  'arcsin x',
  'arccos x',
  'arctg x',
  'arccotg x',
  'sinh x',
  'cosh x',
  'tgh x',
  'cotgh x',
]

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function ElementaryFunctionsQuizPage() {
  const { appData, updateElementarySettings, recordAnswer, recordSession } = useAppData()
  const settings = appData.preferences.elementaryQuiz

  const [phase, setPhase] = useState<Phase>('setup')
  const [showIndividualFunctions, setShowIndividualFunctions] = useState(false)

  // Active session state
  const [activePool, setActivePool] = useState<ElementaryFunction[]>([])
  const [questionQueue, setQuestionQueue] = useState<ElementaryFunction[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalTarget, setTotalTarget] = useState<number | null>(10)
  const [sessionResults, setSessionResults] = useState<SessionQuestionResult[]>([])
  const [sessionStartTime, setSessionStartTime] = useState<number>(0)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  const [recentIds, setRecentIds] = useState<string[]>([])

  // Question interaction state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [textInputCorrect, setTextInputCorrect] = useState<boolean | null>(null)

  // Timer state
  const [elapsedSec, setElapsedSec] = useState(0)
  const [countdownSec, setCountdownSec] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredFunctions = useMemo(() => getFilteredFunctions(settings), [settings])

  const effectiveMode: QuizMode = useMemo(() => {
    if (
      settings.mode === 'input' &&
      settings.answerFacet !== 'formula' &&
      settings.answerFacet !== 'name' &&
      settings.answerFacet !== 'random'
    ) {
      return 'choice'
    }
    return settings.mode
  }, [settings.mode, settings.answerFacet])

  const generateNextQuestion = useCallback(
    (
      idx: number,
      pool: ElementaryFunction[],
      queue: ElementaryFunction[],
      recent: string[],
      cfg: ElementaryQuizSettings,
    ) => {
      let fn: ElementaryFunction
      if (queue.length > idx) {
        fn = queue[idx]
      } else {
        fn = pickWeightedFunction(
          pool,
          appData.stats.functionStats,
          cfg.prioritizeWeak,
          recent,
        )
      }
      const q = buildQuestion(idx, fn, { ...cfg, mode: effectiveMode })
      setCurrentQuestion(q)
      setQuestionIndex(idx)
      setSelectedOptionId(null)
      setIsRevealed(false)
      setFlashcardFlipped(false)
      setTextInput('')
      setTextInputCorrect(null)
      setQuestionStartTime(Date.now())
      if (cfg.timerMode === 'countdown-15') setCountdownSec(15)
      else if (cfg.timerMode === 'countdown-30') setCountdownSec(30)
      else setCountdownSec(null)
    },
    [appData.stats.functionStats, effectiveMode],
  )

  const startQuiz = useCallback(
    (customPool?: ElementaryFunction[]) => {
      const pool = customPool && customPool.length > 0 ? customPool : filteredFunctions
      let queue: ElementaryFunction[] = []
      let target: number | null = null

      if (settings.questionCount === 'all') {
        queue = shuffleArray(pool)
        target = queue.length
      } else if (settings.questionCount === 'infinite') {
        queue = []
        target = null
      } else {
        target = settings.questionCount
        if (!settings.prioritizeWeak && pool.length >= target) {
          queue = shuffleArray(pool).slice(0, target)
        }
      }

      const now = Date.now()
      setActivePool(pool)
      setQuestionQueue(queue)
      setTotalTarget(target)
      setSessionResults([])
      setSessionStartTime(now)
      setElapsedSec(0)
      setRecentIds([])
      setPhase('active')
      generateNextQuestion(0, pool, queue, [], settings)
    },
    [filteredFunctions, generateNextQuestion, settings],
  )

  const finishSession = useCallback(
    (finalResults: SessionQuestionResult[]) => {
      const now = Date.now()
      if (finalResults.length > 0) {
        recordSession({
          id: `sess-${now}-${Math.random().toString(36).slice(2, 7)}`,
          moduleId: 'elementarni-funkce',
          startedAt: sessionStartTime,
          finishedAt: now,
          durationMs: now - sessionStartTime,
          mode: effectiveMode,
          promptFacet: settings.promptFacet,
          answerFacet: settings.answerFacet,
          totalQuestions: finalResults.length,
          correctCount: finalResults.filter((r) => r.isCorrect).length,
          results: finalResults,
        })
      }
      setPhase('summary')
    },
    [effectiveMode, recordSession, sessionStartTime, settings.answerFacet, settings.promptFacet],
  )

  const advanceQuestion = useCallback(
    (latestResults: SessionQuestionResult[]) => {
      const nextIdx = questionIndex + 1
      if (totalTarget !== null && nextIdx >= totalTarget) {
        finishSession(latestResults)
        return
      }
      const nextRecent = currentQuestion
        ? [...recentIds, currentQuestion.fn.id].slice(-Math.min(3, Math.max(1, activePool.length - 1)))
        : recentIds
      setRecentIds(nextRecent)
      generateNextQuestion(nextIdx, activePool, questionQueue, nextRecent, settings)
    },
    [
      activePool,
      currentQuestion,
      finishSession,
      generateNextQuestion,
      questionIndex,
      questionQueue,
      recentIds,
      settings,
      totalTarget,
    ],
  )

  const submitResult = useCallback(
    (
      isCorrect: boolean,
      userAnswerLabel: string,
      optionId: string | null = null,
      skipImmediateReveal = false,
    ) => {
      if (!currentQuestion || isRevealed) return
      const timeMs = Date.now() - questionStartTime
      const correctAnswerLabel = getAnswerPlainLabel(
        currentQuestion.fn,
        currentQuestion.answerFacet,
      )
      const result: SessionQuestionResult = {
        functionId: currentQuestion.fn.id,
        promptFacet: currentQuestion.promptFacet,
        answerFacet: currentQuestion.answerFacet,
        isCorrect,
        userAnswerLabel,
        correctAnswerLabel,
        timeMs,
      }

      recordAnswer(result)
      const nextResults = [...sessionResults, result]
      setSessionResults(nextResults)
      setSelectedOptionId(optionId)

      if (!settings.immediateFeedback && !skipImmediateReveal && effectiveMode === 'choice') {
        advanceQuestion(nextResults)
      } else {
        setIsRevealed(true)
      }
    },
    [
      advanceQuestion,
      currentQuestion,
      effectiveMode,
      isRevealed,
      questionStartTime,
      recordAnswer,
      sessionResults,
      settings.immediateFeedback,
    ],
  )

  const handleOptionSelect = useCallback(
    (opt: QuizOption) => {
      if (!currentQuestion || isRevealed) return
      const label = getAnswerPlainLabel(opt.fn, currentQuestion.answerFacet)
      submitResult(opt.isCorrect, label, opt.id)
    },
    [currentQuestion, isRevealed, submitResult],
  )

  const handleTextSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!currentQuestion || isRevealed) return
      const ok = checkTextAnswer(
        currentQuestion.fn,
        currentQuestion.answerFacet,
        textInput,
      )
      setTextInputCorrect(ok)
      submitResult(ok, textInput.trim() || '(prázdná odpověď)', null, true)
    },
    [currentQuestion, isRevealed, submitResult, textInput],
  )

  const handleFlashcardJudge = useCallback(
    (knewIt: boolean) => {
      if (!currentQuestion || isRevealed) return
      const correctLabel = getAnswerPlainLabel(
        currentQuestion.fn,
        currentQuestion.answerFacet,
      )
      const timeMs = Date.now() - questionStartTime
      const result: SessionQuestionResult = {
        functionId: currentQuestion.fn.id,
        promptFacet: currentQuestion.promptFacet,
        answerFacet: currentQuestion.answerFacet,
        isCorrect: knewIt,
        userAnswerLabel: knewIt ? 'Věděl jsem' : 'Nevěděl jsem',
        correctAnswerLabel: correctLabel,
        timeMs,
      }
      recordAnswer(result)
      const nextResults = [...sessionResults, result]
      setSessionResults(nextResults)
      advanceQuestion(nextResults)
    },
    [
      advanceQuestion,
      currentQuestion,
      isRevealed,
      questionStartTime,
      recordAnswer,
      sessionResults,
    ],
  )

  // Timer tick
  useEffect(() => {
    if (phase !== 'active') return
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1)
      if (!isRevealed) {
        setCountdownSec((prev) => {
          if (prev === null) return null
          if (prev <= 1) return 0
          return prev - 1
        })
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase, isRevealed])

  // Auto-submit when countdown hits 0
  useEffect(() => {
    if (phase === 'active' && countdownSec === 0 && !isRevealed && currentQuestion) {
      if (effectiveMode === 'flashcard') {
        setFlashcardFlipped(true)
      } else {
        setTextInputCorrect(false)
        submitResult(false, 'Čas vypršel', null, true)
      }
    }
  }, [countdownSec, currentQuestion, effectiveMode, isRevealed, phase, submitResult])

  // Focus text input when new input question starts
  useEffect(() => {
    if (phase === 'active' && effectiveMode === 'input' && !isRevealed) {
      inputRef.current?.focus()
    }
  }, [phase, effectiveMode, isRevealed, questionIndex])

  // Keyboard shortcuts during active quiz
  useEffect(() => {
    if (phase !== 'active' || !currentQuestion) return

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'

      if (effectiveMode === 'choice') {
        if (!isRevealed && /^[1-8]$/.test(e.key)) {
          const idx = Number(e.key) - 1
          if (idx < currentQuestion.options.length) {
            e.preventDefault()
            handleOptionSelect(currentQuestion.options[idx])
          }
        } else if (isRevealed && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          advanceQuestion(sessionResults)
        }
      } else if (effectiveMode === 'flashcard') {
        if (!flashcardFlipped && e.key === ' ') {
          e.preventDefault()
          setFlashcardFlipped(true)
        } else if (flashcardFlipped && e.key === '1') {
          e.preventDefault()
          handleFlashcardJudge(false)
        } else if (flashcardFlipped && e.key === '2') {
          e.preventDefault()
          handleFlashcardJudge(true)
        }
      } else if (isRevealed && e.key === 'Enter' && !isTyping) {
        e.preventDefault()
        advanceQuestion(sessionResults)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    advanceQuestion,
    currentQuestion,
    effectiveMode,
    flashcardFlipped,
    handleFlashcardJudge,
    handleOptionSelect,
    isRevealed,
    phase,
    sessionResults,
  ])

  const handleToggleCategory = (catId: FunctionCategory) => {
    updateElementarySettings((prev) => {
      const exists = prev.enabledCategories.includes(catId)
      const nextCats = exists
        ? prev.enabledCategories.filter((c) => c !== catId)
        : [...prev.enabledCategories, catId]
      if (nextCats.length === 0) return prev

      const catFnIds = ELEMENTARY_FUNCTIONS.filter((f) => f.category === catId).map((f) => f.id)
      const nextFnIds = exists
        ? prev.enabledFunctionIds
        : Array.from(new Set([...prev.enabledFunctionIds, ...catFnIds]))

      return {
        ...prev,
        enabledCategories: nextCats,
        enabledFunctionIds: nextFnIds,
      }
    })
  }

  const handleToggleFunction = (fnId: string) => {
    updateElementarySettings((prev) => {
      const exists = prev.enabledFunctionIds.includes(fnId)
      const nextIds = exists
        ? prev.enabledFunctionIds.filter((id) => id !== fnId)
        : [...prev.enabledFunctionIds, fnId]
      if (nextIds.length === 0) return prev
      return { ...prev, enabledFunctionIds: nextIds }
    })
  }

  const handleSelectWeakFunctions = () => {
    const weakIds = ELEMENTARY_FUNCTIONS.filter((fn) => {
      const st = appData.stats.functionStats[fn.id]
      if (!st || st.attempts === 0) return true
      return st.correct / st.attempts < 0.8
    }).map((f) => f.id)

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
  }

  const handleSelectAllFunctions = () => {
    updateElementarySettings({
      enabledCategories: FUNCTION_CATEGORIES.map((c) => c.id),
      enabledFunctionIds: ELEMENTARY_FUNCTIONS.map((f) => f.id),
    })
  }

  const handleSwapDirection = () => {
    const swapped = swapPromptAndAnswer(settings.promptFacet, settings.answerFacet)
    updateElementarySettings(swapped)
  }

  // ===================== PHASE 1: SETUP =====================
  if (phase === 'setup') {
    const swappable = canSwapFacets(settings.promptFacet, settings.answerFacet)

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Plně nastavitelná poznávačka</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Elementární funkce
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/elementarni-funkce/atlas"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Atlas funkcí</span>
            </Link>
            <button
              type="button"
              onClick={() => startQuiz()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Spustit ({filteredFunctions.length} funkcí)</span>
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Rychlé předvolby směru zkoušení</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const active =
                settings.promptFacet === preset.promptFacet &&
                settings.answerFacet === preset.answerFacet
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    updateElementarySettings({
                      promptFacet: preset.promptFacet,
                      answerFacet: preset.answerFacet,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Direction Configurator: Prompt <-> Answer */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Směr otázky a odpovědi
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Vyber si libovolnou kombinaci zadání a odpovědi — nebo je jedním kliknutím obrať.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSwapDirection}
              disabled={!swappable}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40"
              title="Prohodit zadání a odpověď"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Obrátit směr</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Prompt Side */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Co vidím v zadání
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROMPT_FACET_OPTIONS.map((opt) => {
                  const selected = settings.promptFacet === opt.id
                  const conflicts =
                    opt.id !== 'random' && opt.id === settings.answerFacet
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={conflicts}
                      onClick={() => updateElementarySettings({ promptFacet: opt.id })}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        selected
                          ? 'border-indigo-600 bg-white dark:bg-slate-900 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {opt.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Answer Side */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Na co odpovídám
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ANSWER_FACET_OPTIONS.map((opt) => {
                  const selected = settings.answerFacet === opt.id
                  const conflicts =
                    (opt.id !== 'random' && opt.id === settings.promptFacet) ||
                    (settings.promptFacet === 'properties' &&
                      (opt.id === 'domain' ||
                        opt.id === 'range' ||
                        opt.id === 'parity' ||
                        opt.id === 'monotonicity' ||
                        opt.id === 'allProperties'))
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={conflicts}
                      onClick={() => updateElementarySettings({ answerFacet: opt.id })}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        selected
                          ? 'border-indigo-600 bg-white dark:bg-slate-900 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {opt.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mode, Options, Graph & Timing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Quiz Mode & Flow */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-500" />
              <span>Forma zkoušení a průběh</span>
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Režim odpovídání
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'choice', label: 'Výběr (A-B-C-D)' },
                    { id: 'flashcard', label: 'Kartičky' },
                    { id: 'input', label: 'Psaní textu' },
                  ] as const
                ).map((m) => {
                  const inputDisabled =
                    m.id === 'input' &&
                    settings.answerFacet !== 'formula' &&
                    settings.answerFacet !== 'name' &&
                    settings.answerFacet !== 'random'
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={inputDisabled}
                      onClick={() => updateElementarySettings({ mode: m.id })}
                      className={`px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        effectiveMode === m.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
              {settings.mode === 'input' && effectiveMode !== 'input' && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Psaní textu funguje pro odpověď „Předpis“ nebo „Název“ — dočasně přepnuto na výběr z možností.
                </p>
              )}
            </div>

            {effectiveMode === 'choice' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Počet nabízených možností
                </label>
                <div className="flex gap-2">
                  {([2, 4, 6, 8] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => updateElementarySettings({ optionCount: cnt })}
                      className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                        settings.optionCount === cnt
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Počet otázek v sadě
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { val: 5, label: '5' },
                    { val: 10, label: '10' },
                    { val: 15, label: '15' },
                    { val: 20, label: '20' },
                    { val: 'all', label: `Všechny (${filteredFunctions.length})` },
                    { val: 'infinite', label: 'Nekonečný dril' },
                  ] as Array<{ val: QuestionCountOption; label: string }>
                ).map((item) => (
                  <button
                    key={String(item.val)}
                    type="button"
                    onClick={() => updateElementarySettings({ questionCount: item.val })}
                    className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      settings.questionCount === item.val
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                <span>Časovač</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { val: 'off', label: 'Vypnuto' },
                    { val: 'stopwatch', label: 'Stopky' },
                    { val: 'countdown-15', label: '15s / otázka' },
                    { val: 'countdown-30', label: '30s / otázka' },
                  ] as Array<{ val: TimerMode; label: string }>
                ).map((tm) => (
                  <button
                    key={tm.val}
                    type="button"
                    onClick={() => updateElementarySettings({ timerMode: tm.val })}
                    className={`px-2.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      settings.timerMode === tm.val
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.prioritizeWeak}
                  onChange={(e) =>
                    updateElementarySettings({ prioritizeWeak: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    Chytře prioritizovat problémové funkce
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Podle historie v localStorage bude častěji vybírat funkce, ve kterých chybuješ.
                  </div>
                </div>
              </label>

              {effectiveMode === 'choice' && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.immediateFeedback}
                    onChange={(e) =>
                      updateElementarySettings({ immediateFeedback: e.target.checked })
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      Okamžitá zpětná vazba po každé otázce
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Když vypneš, test poběží bez zdržování a vyhodnotí se až na konci.
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Graph Display Options */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Vzhled a obtížnost grafu
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vypnutím popisků os nebo asymptot si můžeš poznávačku výrazně ztížit.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(
                [
                  { key: 'showGrid', label: 'Zobrazit mřížku' },
                  { key: 'showAxisLabels', label: 'Čísla a popisky na osách' },
                  { key: 'showAsymptotes', label: 'Čárkované asymptoty' },
                  { key: 'showKeyPoints', label: 'Význačné a krajní body' },
                  {
                    key: 'uniformViewport',
                    label: 'Jednotné měřítko [−4.5, 4.5]',
                  },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={settings.graphDisplay[item.key]}
                    onChange={(e) =>
                      updateElementarySettings((prev) => ({
                        ...prev,
                        graphDisplay: {
                          ...prev.graphDisplay,
                          [item.key]: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Live graph preview */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Náhled grafu (ukázka: arctg x)
              </div>
              <FunctionGraph
                fn={ELEMENTARY_FUNCTION_MAP['arctan'] ?? ELEMENTARY_FUNCTIONS[0]}
                display={settings.graphDisplay}
                compact
                className="w-full max-w-xs border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Function Selection */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Výběr funkcí ({filteredFunctions.length} z {ELEMENTARY_FUNCTIONS.length} aktivních)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vyber celé kategorie nebo si naklikej přesně ty funkce, které potřebuješ umět.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectWeakFunctions}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Jen slabé / nezkoušené
              </button>
              <button
                type="button"
                onClick={handleSelectAllFunctions}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Vybrat vše
              </button>
              <button
                type="button"
                onClick={() => setShowIndividualFunctions((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Jednotlivé funkce</span>
                {showIndividualFunctions ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FUNCTION_CATEGORIES.map((cat) => {
              const checked = settings.enabledCategories.includes(cat.id)
              const catFns = ELEMENTARY_FUNCTIONS.filter((f) => f.category === cat.id)
              const activeCount = catFns.filter((f) =>
                settings.enabledFunctionIds.includes(f.id),
              ).length
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleToggleCategory(cat.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    checked
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
                      : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {cat.label}
                    </span>
                    <span
                      className={`h-5 w-5 rounded-md flex items-center justify-center text-xs ${
                        checked
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {cat.description}
                  </p>
                  <div className="mt-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    {checked ? `${activeCount} / ${catFns.length} vybráno` : 'Vypnuto'}
                  </div>
                </button>
              )
            })}
          </div>

          {showIndividualFunctions && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ELEMENTARY_FUNCTIONS.map((fn) => {
                const catEnabled = settings.enabledCategories.includes(fn.category)
                const fnEnabled = settings.enabledFunctionIds.includes(fn.id)
                const st = appData.stats.functionStats[fn.id]
                const acc =
                  st && st.attempts > 0 ? Math.round((st.correct / st.attempts) * 100) : null
                return (
                  <label
                    key={fn.id}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs cursor-pointer ${
                      catEnabled && fnEnabled
                        ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={fnEnabled}
                        disabled={!catEnabled}
                        onChange={() => handleToggleFunction(fn.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 shrink-0"
                      />
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {fn.name}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          <MathText latex={fn.formulaLatex.replace(/\\quad.*/, '')} />
                        </div>
                      </div>
                    </div>
                    {acc !== null && (
                      <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">
                        {acc}%
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => startQuiz()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Začít procvičování ({filteredFunctions.length} funkcí)</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===================== PHASE 2: ACTIVE QUIZ =====================
  if (phase === 'active' && currentQuestion) {
    const correctSoFar = sessionResults.filter((r) => r.isCorrect).length
    const progressText =
      totalTarget !== null
        ? `Otázka ${questionIndex + 1} / ${totalTarget}`
        : `Otázka #${questionIndex + 1}`

    const progressPct =
      totalTarget !== null ? Math.round(((questionIndex + (isRevealed ? 1 : 0)) / totalTarget) * 100) : 0

    return (
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Top bar */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-bold">
              {progressText}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
              Správně: <strong>{correctSoFar}</strong> / {sessionResults.length}
            </span>
            {appData.stats.currentStreak > 1 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Flame className="w-3.5 h-3.5" />
                Série {appData.stats.currentStreak}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {countdownSec !== null && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                  countdownSec <= 5
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {countdownSec}s
              </span>
            )}
            {settings.timerMode === 'stopwatch' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(elapsedSec * 1000)}
              </span>
            )}
            {sessionResults.length > 0 && (
              <button
                type="button"
                onClick={() => finishSession(sessionResults)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Ukončit a vyhodnotit
              </button>
            )}
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              Nastavení
            </button>
          </div>
        </div>

        {totalTarget !== null && (
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Question Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-6 shadow-xs">
          <div className="text-center">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              {getQuestionInstruction(currentQuestion.promptFacet, currentQuestion.answerFacet)}
            </h2>
          </div>

          <PromptContent
            fn={currentQuestion.fn}
            facet={currentQuestion.promptFacet}
            graphDisplay={settings.graphDisplay}
          />

          {/* MODE: MULTIPLE CHOICE */}
          {effectiveMode === 'choice' && (
            <div className="space-y-4">
              <div
                className={`grid gap-3 ${
                  currentQuestion.answerFacet === 'graph'
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : currentQuestion.options.length <= 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOptionId === opt.id
                  let stateClasses =
                    'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30'

                  if (isRevealed) {
                    if (opt.isCorrect) {
                      stateClasses =
                        'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                    } else if (isSelected) {
                      stateClasses =
                        'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-500/20'
                    } else {
                      stateClasses =
                        'border-slate-200 dark:border-slate-800 opacity-55'
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isRevealed}
                      onClick={() => handleOptionSelect(opt)}
                      className={`relative text-left p-4 rounded-xl border transition-all flex items-center gap-3.5 cursor-pointer disabled:cursor-default ${stateClasses}`}
                    >
                      <span className="shrink-0 h-7 w-7 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold flex items-center justify-center text-slate-600 dark:text-slate-300">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <AnswerOptionContent
                          fn={opt.fn}
                          facet={currentQuestion.answerFacet}
                          graphDisplay={settings.graphDisplay}
                          compact
                        />
                      </div>
                      {isRevealed && opt.isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {isRevealed && isSelected && !opt.isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* MODE: FLASHCARD */}
          {effectiveMode === 'flashcard' && (
            <div className="space-y-4">
              {!flashcardFlipped ? (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setFlashcardFlipped(true)}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer"
                  >
                    Otočit kartičku (Mezerník)
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/30 p-5 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Správná odpověď
                  </div>
                  <div className="text-slate-900 dark:text-white">
                    <AnswerOptionContent
                      fn={currentQuestion.fn}
                      facet={currentQuestion.answerFacet}
                      graphDisplay={settings.graphDisplay}
                    />
                  </div>
                  <div className="pt-3 border-t border-indigo-200/60 dark:border-indigo-900/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-semibold">Název & předpis: </span>
                      {currentQuestion.fn.name} —{' '}
                      <MathText latex={currentQuestion.fn.formulaLatex} />
                    </div>
                    <div>
                      <span className="font-semibold">D(f): </span>
                      <MathText latex={currentQuestion.fn.domainLatex} /> •{' '}
                      <span className="font-semibold">H(f): </span>
                      <MathText latex={currentQuestion.fn.rangeLatex} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    💡 {currentQuestion.fn.studyTip}
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleFlashcardJudge(false)}
                      className="flex-1 min-w-36 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Nevěděl jsem (1)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFlashcardJudge(true)}
                      className="flex-1 min-w-36 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Věděl jsem (2)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE: TEXT INPUT */}
          {effectiveMode === 'input' && (
            <form onSubmit={handleTextSubmit} className="space-y-3 max-w-xl mx-auto">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  disabled={isRevealed}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    currentQuestion.answerFacet === 'name'
                      ? 'Napiš název funkce (např. arkussinus)...'
                      : 'Napiš předpis (např. arcsin x, sqrt(x), 1/x)...'
                  }
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
                {!isRevealed && (
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm cursor-pointer"
                  >
                    Ověřit
                  </button>
                )}
              </div>

              {!isRevealed && currentQuestion.answerFacet === 'formula' && (
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MATH_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setTextInput(chip)
                        inputRef.current?.focus()
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          {/* Immediate Feedback Banner */}
          {isRevealed && (
            <div
              className={`rounded-xl border p-4 sm:p-5 space-y-3 ${
                (effectiveMode === 'input'
                  ? textInputCorrect
                  : sessionResults[sessionResults.length - 1]?.isCorrect)
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30'
                  : 'border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                  {(effectiveMode === 'input'
                    ? textInputCorrect
                    : sessionResults[sessionResults.length - 1]?.isCorrect) ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-emerald-800 dark:text-emerald-300">Správně!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-600" />
                      <span className="text-rose-800 dark:text-rose-300">
                        Chyba — správně je: {currentQuestion.fn.name} (
                        <MathText
                          latex={currentQuestion.fn.formulaLatex.replace(/\\quad.*/, '')}
                        />
                        )
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => advanceQuestion(sessionResults)}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold hover:opacity-90 cursor-pointer"
                >
                  {totalTarget !== null && questionIndex + 1 >= totalTarget
                    ? 'Zobrazit vyhodnocení (Enter)'
                    : 'Další otázka (Enter)'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700 dark:text-slate-300">
                <div>
                  <strong>D(f):</strong> <MathText latex={currentQuestion.fn.domainLatex} />
                </div>
                <div>
                  <strong>H(f):</strong> <MathText latex={currentQuestion.fn.rangeLatex} />
                </div>
                <div className="capitalize">
                  <strong>Parita:</strong> {currentQuestion.fn.parity}
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                💡 {currentQuestion.fn.studyTip}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===================== PHASE 3: SUMMARY =====================
  const totalQ = sessionResults.length
  const correctQ = sessionResults.filter((r) => r.isCorrect).length
  const pct = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0
  const totalTime = sessionResults.reduce((acc, r) => acc + r.timeMs, 0)
  const wrongFnIds = Array.from(
    new Set(sessionResults.filter((r) => !r.isCorrect).map((r) => r.functionId)),
  )
  const wrongFunctions = wrongFnIds
    .map((id) => ELEMENTARY_FUNCTION_MAP[id])
    .filter((fn): fn is ElementaryFunction => Boolean(fn))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center space-y-5">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-2xl font-extrabold">
          {pct}%
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Výsledek procvičování
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Výsledky byly automaticky uloženy do localStorage prohlížeče.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200/70 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">Správně</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {correctQ} / {totalQ}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200/70 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">Chyb</div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {totalQ - correctQ}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200/70 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">Celkový čas</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatDuration(totalTime)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {wrongFunctions.length > 0 && (
            <button
              type="button"
              onClick={() => startQuiz(wrongFunctions)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Procvičit chybné ({wrongFunctions.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => startQuiz()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Nová sada</span>
          </button>
          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Upravit nastavení</span>
          </button>
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Přehled odpovědí
        </h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sessionResults.map((res, i) => {
            const fn = ELEMENTARY_FUNCTION_MAP[res.functionId]
            if (!fn) return null
            return (
              <div
                key={i}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
              >
                <div className="flex items-start gap-2.5">
                  {res.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {fn.name} •{' '}
                      <MathText latex={fn.formulaLatex.replace(/\\quad.*/, '')} />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Tvoje odpověď: <span className="font-medium">{res.userAnswerLabel}</span>
                      {!res.isCorrect && (
                        <>
                          {' '}
                          • Správně:{' '}
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {res.correctAnswerLabel}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 shrink-0">
                  {(res.timeMs / 1000).toFixed(1)}s
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
