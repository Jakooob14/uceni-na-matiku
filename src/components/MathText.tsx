import katex from 'katex'
import { useMemo } from 'react'

interface MathTextProps {
  latex: string
  displayMode?: boolean
  className?: string
}

export function MathText({ latex, displayMode = false, className = '' }: MathTextProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
      })
    } catch {
      return latex
    }
  }, [latex, displayMode])

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
