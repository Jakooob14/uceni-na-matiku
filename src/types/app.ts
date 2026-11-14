export type ModuleId =
  | 'elementarni-funkce'
  | 'matematicka-logika'
  | 'matice'
  | 'maticova-algebra'
  | 'determinant-matic'
  | 'limity-a-spojitost'
  | 'diferencialni-pocet'

export interface ModuleDefinition {
  id: ModuleId
  title: string
  shortTitle: string
  description: string
  topics: string[]
  status: 'active' | 'planned'
  route: string
  accentColor: string
}

export type FunctionCategory =
  | 'power'
  | 'exponential'
  | 'logarithmic'
  | 'trigonometric'
  | 'cyclometric'
  | 'hyperbolic'

export interface FunctionKeyPoint {
  x: number
  y: number
  label: string
  kind?: 'solid' | 'open'
}

export interface FunctionAsymptote {
  axis: 'x' | 'y'
  value: number
  label?: string
}

export interface FunctionDomainSegment {
  xMin: number
  xMax: number
  includeStart?: boolean
  includeEnd?: boolean
}

export interface FunctionGraphConfig {
  /** Evaluates y = f(x); return NaN or null if outside domain or near pole */
  evaluate: (x: number) => number | null
  /** Explicit segments to prevent connecting across poles/jumps */
  segments: FunctionDomainSegment[]
  /** Default viewport bounds tailored for clear shape recognition */
  viewport: {
    xMin: number
    xMax: number
    yMin: number
    yMax: number
  }
  /** Optional pi-scaled x ticks */
  xTickStep?: 'numeric' | 'pi-half' | 'pi'
  yTickStep?: 'numeric' | 'pi-half' | 'pi'
  asymptotes?: FunctionAsymptote[]
  keyPoints?: FunctionKeyPoint[]
}

export interface ElementaryFunction {
  id: string
  category: FunctionCategory
  name: string
  formulaLatex: string
  /** Accepted plain-text inputs for typing mode (normalized during check) */
  acceptedInputs: string[]
  /** Alternative names accepted in typing mode */
  acceptedNames: string[]
  domainLatex: string
  domainPlain: string
  rangeLatex: string
  rangePlain: string
  parity: 'sudá' | 'lichá' | 'ani sudá, ani lichá'
  periodicity: string
  isPeriodic: boolean
  boundedness: 'omezená' | 'omezená zdola' | 'omezená shora' | 'neomezená'
  monotonicity: string
  asymptotesSummary: string
  studyTip: string
  graph: FunctionGraphConfig
}

export type PromptFacet =
  | 'graph'
  | 'formula'
  | 'name'
  | 'properties'
  | 'random'

export type AnswerFacet =
  | 'formula'
  | 'name'
  | 'graph'
  | 'domain'
  | 'range'
  | 'parity'
  | 'monotonicity'
  | 'allProperties'
  | 'random'

export type QuizMode = 'choice' | 'flashcard' | 'input'

export type QuestionCountOption = 5 | 10 | 15 | 20 | 'all' | 'infinite'

export type TimerMode = 'off' | 'stopwatch' | 'countdown-15' | 'countdown-30'

export interface GraphDisplaySettings {
  showGrid: boolean
  showAxisLabels: boolean
  showAsymptotes: boolean
  showKeyPoints: boolean
  uniformViewport: boolean
}

export interface ElementaryQuizSettings {
  promptFacet: PromptFacet
  answerFacet: AnswerFacet
  mode: QuizMode
  optionCount: 2 | 4 | 6 | 8
  enabledCategories: FunctionCategory[]
  enabledFunctionIds: string[]
  questionCount: QuestionCountOption
  prioritizeWeak: boolean
  immediateFeedback: boolean
  timerMode: TimerMode
  graphDisplay: GraphDisplaySettings
}

export interface FunctionMasteryStats {
  attempts: number
  correct: number
  streak: number
  bestStreak: number
  lastSeenAt: number | null
  lastCorrectAt: number | null
  totalTimeMs: number
}

export interface SessionQuestionResult {
  functionId: string
  promptFacet: Exclude<PromptFacet, 'random'>
  answerFacet: Exclude<AnswerFacet, 'random'>
  isCorrect: boolean
  userAnswerLabel: string
  correctAnswerLabel: string
  timeMs: number
}

export interface QuizSessionRecord {
  id: string
  moduleId: ModuleId
  startedAt: number
  finishedAt: number
  durationMs: number
  mode: QuizMode
  promptFacet: PromptFacet
  answerFacet: AnswerFacet
  totalQuestions: number
  correctCount: number
  results: SessionQuestionResult[]
}

export interface AppPreferences {
  theme: 'light' | 'dark'
  elementaryQuiz: ElementaryQuizSettings
}

export interface AppStats {
  totalSessions: number
  totalAnswered: number
  totalCorrect: number
  currentStreak: number
  bestStreak: number
  totalTimeMs: number
  functionStats: Record<string, FunctionMasteryStats | undefined>
  sessions: QuizSessionRecord[]
}

export interface AppData {
  version: 1
  updatedAt: number
  preferences: AppPreferences
  stats: AppStats
  /** Reserved storage namespace for upcoming modules */
  moduleData: Record<string, unknown>
}

export interface ExportPayload {
  app: 'uceni-na-matiku'
  formatVersion: 1
  exportedAt: string
  data: AppData
}
