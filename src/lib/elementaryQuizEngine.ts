import { ELEMENTARY_FUNCTIONS } from '#/data/elementaryFunctions'
import type {
  AnswerFacet,
  ElementaryFunction,
  ElementaryQuizSettings,
  FunctionMasteryStats,
  PromptFacet,
} from '#/types/app'

export type ConcretePromptFacet = Exclude<PromptFacet, 'random'>
export type ConcreteAnswerFacet = Exclude<AnswerFacet, 'random'>

export interface QuizOption {
  id: string
  fn: ElementaryFunction
  answerKey: string
  isCorrect: boolean
}

export interface GeneratedQuestion {
  index: number
  fn: ElementaryFunction
  promptFacet: ConcretePromptFacet
  answerFacet: ConcreteAnswerFacet
  options: QuizOption[]
}

export const PROMPT_FACET_OPTIONS: Array<{
  id: PromptFacet
  label: string
  shortLabel: string
  description: string
}> = [
  {
    id: 'graph',
    label: 'Graf funkce',
    shortLabel: 'Graf',
    description: 'Zobrazí se vykreslený průběh funkce v souřadnicové soustavě.',
  },
  {
    id: 'formula',
    label: 'Předpis funkce',
    shortLabel: 'Předpis',
    description: 'Zobrazí se matematický zápis, např. f(x) = arctg x.',
  },
  {
    id: 'name',
    label: 'Název funkce',
    shortLabel: 'Název',
    description: 'Zobrazí se slovní název, např. Hyperbolický kosinus.',
  },
  {
    id: 'properties',
    label: 'Karta vlastností',
    shortLabel: 'Vlastnosti',
    description: 'Zobrazí se D(f), H(f), parita, omezenost a monotonie.',
  },
  {
    id: 'random',
    label: 'Náhodně střídat',
    shortLabel: 'Náhodně',
    description: 'Každá otázka náhodně zvolí jiný typ zadání.',
  },
]

export const ANSWER_FACET_OPTIONS: Array<{
  id: AnswerFacet
  label: string
  shortLabel: string
  description: string
}> = [
  {
    id: 'formula',
    label: 'Předpis funkce',
    shortLabel: 'Předpis',
    description: 'Urči správný vzorec f(x) = ...',
  },
  {
    id: 'name',
    label: 'Název funkce',
    shortLabel: 'Název',
    description: 'Urči název funkce (např. Arkussinus).',
  },
  {
    id: 'graph',
    label: 'Graf funkce',
    shortLabel: 'Graf',
    description: 'Vyber správný graf funkce z nabídky grafů.',
  },
  {
    id: 'domain',
    label: 'Definiční obor D(f)',
    shortLabel: 'D(f)',
    description: 'Urči definiční obor funkce.',
  },
  {
    id: 'range',
    label: 'Obor hodnot H(f)',
    shortLabel: 'H(f)',
    description: 'Urči obor hodnot funkce.',
  },
  {
    id: 'parity',
    label: 'Parita a periodicita',
    shortLabel: 'Parita',
    description: 'Sudá / lichá / ani jedna a zda je periodická.',
  },
  {
    id: 'monotonicity',
    label: 'Monotonie a omezenost',
    shortLabel: 'Monotonie',
    description: 'Kde funkce roste/klesá a jak je omezená.',
  },
  {
    id: 'allProperties',
    label: 'Souhrn vlastností',
    shortLabel: 'Vlastnosti',
    description: 'Kompletní profil vlastností funkce.',
  },
  {
    id: 'random',
    label: 'Náhodně střídat',
    shortLabel: 'Náhodně',
    description: 'Každá otázka se zeptá na jinou vlastnost nebo reprezentaci.',
  },
]

export function getAnswerKey(fn: ElementaryFunction, facet: ConcreteAnswerFacet): string {
  switch (facet) {
    case 'formula':
      return fn.id
    case 'name':
      return fn.name
    case 'graph':
      return fn.id
    case 'domain':
      return fn.domainLatex
    case 'range':
      return fn.rangeLatex
    case 'parity':
      return `${fn.parity}|${fn.isPeriodic ? fn.periodicity : 'neperiodická'}`
    case 'monotonicity':
      return `${fn.monotonicity}|${fn.boundedness}`
    case 'allProperties':
      return fn.id
  }
}

export function getAnswerPlainLabel(fn: ElementaryFunction, facet: ConcreteAnswerFacet): string {
  switch (facet) {
    case 'formula':
      return fn.formulaLatex.replace(/\\quad.*/, '').trim()
    case 'name':
      return fn.name
    case 'graph':
      return `Graf: ${fn.name}`
    case 'domain':
      return fn.domainPlain
    case 'range':
      return fn.rangePlain
    case 'parity':
      return `${fn.parity}, ${fn.periodicity}`
    case 'monotonicity':
      return `${fn.monotonicity} (${fn.boundedness})`
    case 'allProperties':
      return `D(f)=${fn.domainPlain}, H(f)=${fn.rangePlain}, ${fn.parity}`
  }
}

export function getFilteredFunctions(settings: ElementaryQuizSettings): ElementaryFunction[] {
  const catSet = new Set(settings.enabledCategories)
  const idSet = new Set(settings.enabledFunctionIds)
  const filtered = ELEMENTARY_FUNCTIONS.filter(
    (fn) => catSet.has(fn.category) && idSet.has(fn.id),
  )
  return filtered.length > 0 ? filtered : ELEMENTARY_FUNCTIONS
}

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function getFunctionWeight(
  fn: ElementaryFunction,
  statsMap: Record<string, FunctionMasteryStats | undefined>,
): number {
  const s = statsMap[fn.id]
  if (!s || s.attempts === 0) return 2.4 // Prioritize unseen functions gently
  const accuracy = s.correct / s.attempts
  // Lower accuracy => higher weight
  const errorWeight = 1 + (1 - accuracy) * 3.5
  const streakBonus = Math.max(0.4, 1 - s.streak * 0.12)
  return errorWeight * streakBonus
}

export function pickWeightedFunction(
  pool: ElementaryFunction[],
  statsMap: Record<string, FunctionMasteryStats | undefined>,
  prioritizeWeak: boolean,
  recentIds: string[],
): ElementaryFunction {
  const nonRecent = pool.filter((f) => !recentIds.includes(f.id))
  const candidates = nonRecent.length > 0 ? nonRecent : pool

  if (!prioritizeWeak) {
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  const weights = candidates.map((f) => getFunctionWeight(f, statsMap))
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * totalWeight
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]
    if (r <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

const CONCRETE_PROMPTS: ConcretePromptFacet[] = ['graph', 'formula', 'name', 'properties']
const CONCRETE_ANSWERS: ConcreteAnswerFacet[] = [
  'formula',
  'name',
  'graph',
  'domain',
  'range',
  'parity',
  'monotonicity',
]

export function resolveFacets(
  promptSetting: PromptFacet,
  answerSetting: AnswerFacet,
  mode: ElementaryQuizSettings['mode'],
): { promptFacet: ConcretePromptFacet; answerFacet: ConcreteAnswerFacet } {
  let promptFacet: ConcretePromptFacet =
    promptSetting === 'random'
      ? CONCRETE_PROMPTS[Math.floor(Math.random() * CONCRETE_PROMPTS.length)]
      : promptSetting

  let answerFacet: ConcreteAnswerFacet
  if (answerSetting === 'random') {
    const allowed = CONCRETE_ANSWERS.filter((a) => {
      if (mode === 'input' && a !== 'formula' && a !== 'name') return false
      if (a === 'graph' && promptFacet === 'graph') return false
      if (a === 'formula' && promptFacet === 'formula') return false
      if (a === 'name' && promptFacet === 'name') return false
      if (
        promptFacet === 'properties' &&
        (a === 'domain' || a === 'range' || a === 'parity' || a === 'monotonicity')
      ) {
        return false
      }
      return true
    })
    const candidates = allowed.length > 0 ? allowed : ['formula' as ConcreteAnswerFacet]
    answerFacet = candidates[Math.floor(Math.random() * candidates.length)]
  } else {
    answerFacet = answerSetting
    // Avoid trivial identity question when random prompt equals fixed answer
    if (promptSetting === 'random') {
      const nonMatching = CONCRETE_PROMPTS.filter((p) => {
        if (p === 'graph' && answerFacet === 'graph') return false
        if (p === 'formula' && answerFacet === 'formula') return false
        if (p === 'name' && answerFacet === 'name') return false
        if (
          p === 'properties' &&
          (answerFacet === 'domain' ||
            answerFacet === 'range' ||
            answerFacet === 'parity' ||
            answerFacet === 'monotonicity' ||
            answerFacet === 'allProperties')
        ) {
          return false
        }
        return true
      })
      if (nonMatching.length > 0) {
        promptFacet = nonMatching[Math.floor(Math.random() * nonMatching.length)]
      }
    }
  }

  return { promptFacet, answerFacet }
}

export function buildQuestion(
  index: number,
  fn: ElementaryFunction,
  settings: ElementaryQuizSettings,
): GeneratedQuestion {
  const { promptFacet, answerFacet } = resolveFacets(
    settings.promptFacet,
    settings.answerFacet,
    settings.mode,
  )

  const correctKey = getAnswerKey(fn, answerFacet)
  const usedKeys = new Set<string>([correctKey])

  const options: QuizOption[] = [
    {
      id: `${fn.id}-correct`,
      fn,
      answerKey: correctKey,
      isCorrect: true,
    },
  ]

  // Prefer distractors from same category first for meaningful challenge, then all functions
  const sameCategory = shuffleArray(
    ELEMENTARY_FUNCTIONS.filter((f) => f.id !== fn.id && f.category === fn.category),
  )
  const otherCategory = shuffleArray(
    ELEMENTARY_FUNCTIONS.filter((f) => f.id !== fn.id && f.category !== fn.category),
  )
  const candidatePool = [...sameCategory, ...otherCategory]

  for (const cand of candidatePool) {
    if (options.length >= settings.optionCount) break
    const key = getAnswerKey(cand, answerFacet)
    if (usedKeys.has(key)) continue
    usedKeys.add(key)
    options.push({
      id: `${cand.id}-opt`,
      fn: cand,
      answerKey: key,
      isCorrect: false,
    })
  }

  return {
    index,
    fn,
    promptFacet,
    answerFacet,
    options: shuffleArray(options),
  }
}

export function normalizeMathText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^f\s*\(\s*x\s*\)\s*=\s*/i, '')
    .replace(/^y\s*=\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/−/g, '-')
    .replace(/·|\*/g, '')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
}

export function checkTextAnswer(
  fn: ElementaryFunction,
  answerFacet: ConcreteAnswerFacet,
  rawInput: string,
): boolean {
  const norm = normalizeMathText(rawInput)
  if (!norm) return false

  if (answerFacet === 'name') {
    const candidates = [fn.name, ...fn.acceptedNames].map(normalizeMathText)
    return candidates.includes(norm)
  }

  // Formula check
  const candidates = fn.acceptedInputs.map(normalizeMathText)
  if (candidates.includes(norm)) return true

  // Also accept stripped outer parentheses around x, e.g. sin(x) vs sinx
  const stripped = norm.replace(/\(x\)/g, 'x')
  return candidates.some((c) => c.replace(/\(x\)/g, 'x') === stripped)
}

export function canSwapFacets(prompt: PromptFacet, answer: AnswerFacet): boolean {
  const swappableAnswers = new Set<AnswerFacet>([
    'graph',
    'formula',
    'name',
    'allProperties',
    'random',
  ])
  const swappablePrompts = new Set<PromptFacet>([
    'graph',
    'formula',
    'name',
    'properties',
    'random',
  ])
  return swappableAnswers.has(answer) && swappablePrompts.has(prompt)
}

export function swapPromptAndAnswer(
  prompt: PromptFacet,
  answer: AnswerFacet,
): { promptFacet: PromptFacet; answerFacet: AnswerFacet } {
  const nextPrompt: PromptFacet =
    answer === 'allProperties' ||
    answer === 'domain' ||
    answer === 'range' ||
    answer === 'parity' ||
    answer === 'monotonicity'
      ? 'properties'
      : answer

  const nextAnswer: AnswerFacet = prompt === 'properties' ? 'allProperties' : prompt

  return { promptFacet: nextPrompt, answerFacet: nextAnswer }
}
