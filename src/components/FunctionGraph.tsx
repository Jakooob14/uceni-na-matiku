import { useId, useMemo } from 'react'
import type { ElementaryFunction, GraphDisplaySettings } from '#/types/app'

interface FunctionGraphProps {
  fn: ElementaryFunction
  display?: Partial<GraphDisplaySettings>
  compact?: boolean
  hidePointLabels?: boolean
  className?: string
}

const DEFAULT_DISPLAY: GraphDisplaySettings = {
  showGrid: true,
  showAxisLabels: true,
  showAsymptotes: true,
  showKeyPoints: true,
  uniformViewport: false,
}

function formatPiTick(k: number): string {
  // k is in units of pi/2
  if (k === 0) return '0'
  const sign = k < 0 ? '−' : ''
  const abs = Math.abs(k)
  if (abs === 1) return `${sign}π/2`
  if (abs === 2) return `${sign}π`
  if (abs % 2 === 0) return `${sign}${abs / 2}π`
  return `${sign}${abs}π/2`
}

export function FunctionGraph({
  fn,
  display,
  compact = false,
  hidePointLabels = false,
  className = '',
}: FunctionGraphProps) {
  const clipId = useId()
  const cfg = { ...DEFAULT_DISPLAY, ...display }

  const width = compact ? 280 : 480
  const height = compact ? 200 : 340
  const pad = compact ? 14 : 20

  const viewport = useMemo(() => {
    if (cfg.uniformViewport) {
      return { xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 4.5 }
    }
    return fn.graph.viewport
  }, [cfg.uniformViewport, fn.graph.viewport])

  const plotW = width - pad * 2
  const plotH = height - pad * 2

  const toSvgX = (x: number) =>
    pad + ((x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * plotW
  const toSvgY = (y: number) =>
    pad + ((viewport.yMax - y) / (viewport.yMax - viewport.yMin)) * plotH

  // Compute grid & tick positions
  const { xTicks, yTicks } = useMemo(() => {
    const xList: Array<{ val: number; label: string }> = []
    const yList: Array<{ val: number; label: string }> = []

    const xStepMode = cfg.uniformViewport ? 'numeric' : (fn.graph.xTickStep ?? 'numeric')
    const yStepMode = cfg.uniformViewport ? 'numeric' : (fn.graph.yTickStep ?? 'numeric')

    if (xStepMode === 'pi-half') {
      const halfPi = Math.PI / 2
      const kMin = Math.ceil(viewport.xMin / halfPi)
      const kMax = Math.floor(viewport.xMax / halfPi)
      for (let k = kMin; k <= kMax; k++) {
        if (k === 0) continue
        xList.push({ val: k * halfPi, label: formatPiTick(k) })
      }
    } else {
      const span = viewport.xMax - viewport.xMin
      const step = span > 11 ? 2 : 1
      const start = Math.ceil(viewport.xMin / step) * step
      for (let x = start; x <= viewport.xMax; x += step) {
        if (Math.abs(x) < 1e-9) continue
        xList.push({ val: x, label: String(x).replace('-', '−') })
      }
    }

    if (yStepMode === 'pi-half') {
      const halfPi = Math.PI / 2
      const kMin = Math.ceil(viewport.yMin / halfPi)
      const kMax = Math.floor(viewport.yMax / halfPi)
      for (let k = kMin; k <= kMax; k++) {
        if (k === 0) continue
        yList.push({ val: k * halfPi, label: formatPiTick(k) })
      }
    } else {
      const span = viewport.yMax - viewport.yMin
      const step = span > 10 ? 2 : 1
      const start = Math.ceil(viewport.yMin / step) * step
      for (let y = start; y <= viewport.yMax; y += step) {
        if (Math.abs(y) < 1e-9) continue
        yList.push({ val: y, label: String(y).replace('-', '−') })
      }
    }

    return { xTicks: xList, yTicks: yList }
  }, [cfg.uniformViewport, fn.graph.xTickStep, fn.graph.yTickStep, viewport])

  // Build SVG path data across segments
  const pathData = useMemo(() => {
    const paths: string[] = []
    const ySpan = viewport.yMax - viewport.yMin
    const yClipLimit = ySpan * 1.8
    const samplesPerUnit = compact ? 36 : 56

    const segments = cfg.uniformViewport
      ? fn.graph.segments.map((seg) => ({
          ...seg,
          xMin: Math.max(seg.xMin, viewport.xMin - 0.5),
          xMax: Math.min(seg.xMax, viewport.xMax + 0.5),
        }))
      : fn.graph.segments

    for (const seg of segments) {
      if (seg.xMax <= seg.xMin) continue
      const xStart = Math.max(seg.xMin, viewport.xMin - 0.5)
      const xEnd = Math.min(seg.xMax, viewport.xMax + 0.5)
      if (xEnd <= xStart) continue

      const steps = Math.max(40, Math.ceil((xEnd - xStart) * samplesPerUnit))
      let currentD = ''
      let prevY: number | null = null

      for (let i = 0; i <= steps; i++) {
        const x = xStart + ((xEnd - xStart) * i) / steps
        const y = fn.graph.evaluate(x)

        if (y === null || Number.isNaN(y) || !Number.isFinite(y)) {
          if (currentD) {
            paths.push(currentD)
            currentD = ''
          }
          prevY = null
          continue
        }

        // Guard against extreme asymptote jump
        if (prevY !== null && Math.abs(y - prevY) > yClipLimit) {
          if (currentD) {
            paths.push(currentD)
            currentD = ''
          }
        }

        const clampedY = Math.max(
          viewport.yMin - ySpan,
          Math.min(viewport.yMax + ySpan, y),
        )
        const sx = toSvgX(x).toFixed(2)
        const sy = toSvgY(clampedY).toFixed(2)

        if (!currentD) {
          currentD = `M ${sx} ${sy}`
        } else {
          currentD += ` L ${sx} ${sy}`
        }
        prevY = y
      }

      if (currentD) {
        paths.push(currentD)
      }
    }

    return paths
  }, [cfg.uniformViewport, compact, fn.graph, viewport, plotW, plotH])

  const originX = toSvgX(0)
  const originY = toSvgY(0)
  const xAxisVisible = viewport.yMin <= 0 && viewport.yMax >= 0
  const yAxisVisible = viewport.xMin <= 0 && viewport.xMax >= 0

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`select-none overflow-hidden rounded-xl bg-white dark:bg-slate-950 ${className}`}
      role="img"
      aria-label="Graf funkce"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={pad} y={pad} width={plotW} height={plotH} rx={4} />
        </clipPath>
      </defs>

      {/* Plot border */}
      <rect
        x={pad}
        y={pad}
        width={plotW}
        height={plotH}
        rx={4}
        className="fill-slate-50/60 stroke-slate-200 dark:fill-slate-900/60 dark:stroke-slate-800"
        strokeWidth={1}
      />

      <g clipPath={`url(#${clipId})`}>
        {/* Grid lines */}
        {cfg.showGrid && (
          <g className="stroke-slate-200/80 dark:stroke-slate-800/80" strokeWidth={1}>
            {xTicks.map((t) => {
              const sx = toSvgX(t.val)
              return <line key={`gx-${t.val}`} x1={sx} y1={pad} x2={sx} y2={pad + plotH} />
            })}
            {yTicks.map((t) => {
              const sy = toSvgY(t.val)
              return <line key={`gy-${t.val}`} x1={pad} y1={sy} x2={pad + plotW} y2={sy} />
            })}
          </g>
        )}

        {/* Asymptotes */}
        {cfg.showAsymptotes && fn.graph.asymptotes && (
          <g>
            {fn.graph.asymptotes.map((asym, idx) => {
              if (asym.axis === 'x') {
                const sx = toSvgX(asym.value)
                if (sx < pad || sx > pad + plotW) return null
                return (
                  <line
                    key={`ax-${idx}`}
                    x1={sx}
                    y1={pad}
                    x2={sx}
                    y2={pad + plotH}
                    className="stroke-rose-400/75 dark:stroke-rose-500/70"
                    strokeWidth={1.4}
                    strokeDasharray="5 4"
                  />
                )
              }
              const sy = toSvgY(asym.value)
              if (sy < pad || sy > pad + plotH) return null
              return (
                <line
                  key={`ay-${idx}`}
                  x1={pad}
                  y1={sy}
                  x2={pad + plotW}
                  y2={sy}
                  className="stroke-rose-400/75 dark:stroke-rose-500/70"
                  strokeWidth={1.4}
                  strokeDasharray="5 4"
                />
              )
            })}
          </g>
        )}

        {/* Coordinate axes */}
        {xAxisVisible && (
          <g className="stroke-slate-500 dark:stroke-slate-400">
            <line x1={pad} y1={originY} x2={pad + plotW} y2={originY} strokeWidth={1.4} />
            <polygon
              points={`${pad + plotW},${originY} ${pad + plotW - 7},${originY - 3.5} ${pad + plotW - 7},${originY + 3.5}`}
              className="fill-slate-500 dark:fill-slate-400 stroke-none"
            />
          </g>
        )}

        {yAxisVisible && (
          <g className="stroke-slate-500 dark:stroke-slate-400">
            <line x1={originX} y1={pad} x2={originX} y2={pad + plotH} strokeWidth={1.4} />
            <polygon
              points={`${originX},${pad} ${originX - 3.5},${pad + 7} ${originX + 3.5},${pad + 7}`}
              className="fill-slate-500 dark:fill-slate-400 stroke-none"
            />
          </g>
        )}

        {/* Tick marks & labels */}
        {cfg.showAxisLabels && (
          <g className="fill-slate-500 dark:fill-slate-400" fontSize={compact ? 9 : 11}>
            {xAxisVisible &&
              xTicks.map((t) => {
                const sx = toSvgX(t.val)
                const labelY = Math.min(pad + plotH - 4, Math.max(pad + 12, originY + 13))
                return (
                  <g key={`tx-${t.val}`}>
                    <line
                      x1={sx}
                      y1={originY - 3}
                      x2={sx}
                      y2={originY + 3}
                      className="stroke-slate-500 dark:stroke-slate-400"
                      strokeWidth={1.1}
                    />
                    <text x={sx} y={labelY} textAnchor="middle">
                      {t.label}
                    </text>
                  </g>
                )
              })}

            {yAxisVisible &&
              yTicks.map((t) => {
                const sy = toSvgY(t.val)
                const labelX = Math.max(pad + 6, Math.min(pad + plotW - 14, originX - 7))
                return (
                  <g key={`ty-${t.val}`}>
                    <line
                      x1={originX - 3}
                      y1={sy}
                      x2={originX + 3}
                      y2={sy}
                      className="stroke-slate-500 dark:stroke-slate-400"
                      strokeWidth={1.1}
                    />
                    <text x={labelX} y={sy + 3.5} textAnchor="end">
                      {t.label}
                    </text>
                  </g>
                )
              })}

            {xAxisVisible && yAxisVisible && (
              <text x={originX - 6} y={originY + 13} textAnchor="end">
                0
              </text>
            )}

            {/* Axis names x and y */}
            {xAxisVisible && (
              <text
                x={pad + plotW - 10}
                y={Math.max(pad + 12, originY - 7)}
                textAnchor="end"
                fontWeight="600"
                fontStyle="italic"
              >
                x
              </text>
            )}
            {yAxisVisible && (
              <text
                x={Math.min(pad + plotW - 10, originX + 9)}
                y={pad + 14}
                textAnchor="start"
                fontWeight="600"
                fontStyle="italic"
              >
                y
              </text>
            )}
          </g>
        )}

        {/* Function curve */}
        <g
          fill="none"
          className="stroke-indigo-600 dark:stroke-indigo-400"
          strokeWidth={compact ? 2.2 : 2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {pathData.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* Key points & endpoints */}
        {cfg.showKeyPoints && fn.graph.keyPoints && (
          <g>
            {fn.graph.keyPoints.map((pt, i) => {
              const sx = toSvgX(pt.x)
              const sy = toSvgY(pt.y)
              if (sx < pad - 5 || sx > pad + plotW + 5 || sy < pad - 5 || sy > pad + plotH + 5) {
                return null
              }
              const isOpen = pt.kind === 'open'
              return (
                <g key={`kp-${i}`}>
                  <circle
                    cx={sx}
                    cy={sy}
                    r={compact ? 3.5 : 4.3}
                    className={
                      isOpen
                        ? 'fill-white stroke-indigo-600 dark:fill-slate-950 dark:stroke-indigo-400'
                        : 'fill-indigo-600 stroke-white dark:fill-indigo-400 dark:stroke-slate-950'
                    }
                    strokeWidth={2}
                  />
                  {!compact &&
                    !hidePointLabels &&
                    cfg.showAxisLabels &&
                    pt.label && (
                      <text
                        x={sx + 7}
                        y={sy - 7}
                        fontSize={10.5}
                        fontWeight={600}
                        className="fill-indigo-700 dark:fill-indigo-300"
                      >
                        {pt.label}
                      </text>
                    )}
                </g>
              )
            })}
          </g>
        )}
      </g>
    </svg>
  )
}
