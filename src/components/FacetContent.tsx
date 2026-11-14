import { FunctionGraph } from '#/components/FunctionGraph'
import { MathText } from '#/components/MathText'
import type { ConcreteAnswerFacet, ConcretePromptFacet } from '#/lib/elementaryQuizEngine'
import type { ElementaryFunction, GraphDisplaySettings } from '#/types/app'

export function PromptContent({
  fn,
  facet,
  graphDisplay,
}: {
  fn: ElementaryFunction
  facet: ConcretePromptFacet
  graphDisplay: GraphDisplaySettings
}) {
  if (facet === 'graph') {
    return (
      <div className="w-full max-w-lg mx-auto">
        <FunctionGraph
          fn={fn}
          display={graphDisplay}
          hidePointLabels={false}
          className="w-full h-auto border border-slate-200 dark:border-slate-800 shadow-xs"
        />
      </div>
    )
  }

  if (facet === 'formula') {
    return (
      <div className="py-8 px-4 text-center">
        <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-3">
          Předpis funkce
        </div>
        <div className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">
          <MathText latex={fn.formulaLatex} displayMode />
        </div>
      </div>
    )
  }

  if (facet === 'name') {
    return (
      <div className="py-10 px-4 text-center">
        <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-3">
          Název funkce
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
          {fn.name}
        </div>
      </div>
    )
  }

  // properties
  return (
    <div className="max-w-lg mx-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 sm:p-5">
      <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-3">
        Vlastnosti hledané funkce
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-white dark:bg-slate-950 p-3 border border-slate-200/80 dark:border-slate-800">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Definiční obor D(f)</dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
            <MathText latex={fn.domainLatex} />
          </dd>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-950 p-3 border border-slate-200/80 dark:border-slate-800">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Obor hodnot H(f)</dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
            <MathText latex={fn.rangeLatex} />
          </dd>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-950 p-3 border border-slate-200/80 dark:border-slate-800">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Parita & periodicita</dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100 capitalize">
            {fn.parity}, {fn.periodicity}
          </dd>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-950 p-3 border border-slate-200/80 dark:border-slate-800">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Omezenost</dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100 capitalize">
            {fn.boundedness}
          </dd>
        </div>
        <div className="sm:col-span-2 rounded-lg bg-white dark:bg-slate-950 p-3 border border-slate-200/80 dark:border-slate-800">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Monotonie & asymptoty</dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
            {fn.monotonicity} • {fn.asymptotesSummary}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function AnswerOptionContent({
  fn,
  facet,
  graphDisplay,
  compact = false,
}: {
  fn: ElementaryFunction
  facet: ConcreteAnswerFacet
  graphDisplay: GraphDisplaySettings
  compact?: boolean
}) {
  switch (facet) {
    case 'formula':
      return (
        <div className={compact ? 'text-base' : 'text-lg sm:text-xl'}>
          <MathText latex={fn.formulaLatex} />
        </div>
      )
    case 'name':
      return <span className="font-semibold text-base sm:text-lg">{fn.name}</span>
    case 'graph':
      return (
        <div className="w-full">
          <FunctionGraph
            fn={fn}
            display={graphDisplay}
            compact
            hidePointLabels
            className="w-full h-auto"
          />
        </div>
      )
    case 'domain':
      return (
        <div className="text-base sm:text-lg">
          <MathText latex={fn.domainLatex} />
        </div>
      )
    case 'range':
      return (
        <div className="text-base sm:text-lg">
          <MathText latex={fn.rangeLatex} />
        </div>
      )
    case 'parity':
      return (
        <div className="text-sm sm:text-base">
          <span className="font-semibold capitalize">{fn.parity}</span>
          <span className="text-slate-500 dark:text-slate-400"> • {fn.periodicity}</span>
        </div>
      )
    case 'monotonicity':
      return (
        <div className="text-sm leading-snug">
          <div className="font-semibold">{fn.monotonicity}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
            Omezenost: {fn.boundedness}
          </div>
        </div>
      )
    case 'allProperties':
      return (
        <div className="text-xs sm:text-sm space-y-1 text-left">
          <div>
            <span className="text-slate-500 dark:text-slate-400">D(f): </span>
            <MathText latex={fn.domainLatex} />
            <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500 dark:text-slate-400">H(f): </span>
            <MathText latex={fn.rangeLatex} />
          </div>
          <div className="text-slate-700 dark:text-slate-300">
            <span className="capitalize">{fn.parity}</span> • {fn.boundedness} • {fn.monotonicity}
          </div>
        </div>
      )
  }
}

export function getQuestionInstruction(
  promptFacet: ConcretePromptFacet,
  answerFacet: ConcreteAnswerFacet,
): string {
  const promptLabels: Record<ConcretePromptFacet, string> = {
    graph: 'Podle grafu',
    formula: 'Podle předpisu',
    name: 'Podle názvu',
    properties: 'Podle vlastností',
  }

  const answerLabels: Record<ConcreteAnswerFacet, string> = {
    formula: 'urči předpis funkce',
    name: 'urči název funkce',
    graph: 'vyber odpovídající graf funkce',
    domain: 'urči definiční obor D(f)',
    range: 'urči obor hodnot H(f)',
    parity: 'urči paritu a periodicitu',
    monotonicity: 'urči monotonii a omezenost',
    allProperties: 'vyber správnou kartu vlastností',
  }

  return `${promptLabels[promptFacet]} ${answerLabels[answerFacet]}.`
}
