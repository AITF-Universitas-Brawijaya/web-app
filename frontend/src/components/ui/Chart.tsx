'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/lib/utils'

// --- Theme tokens ---
const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = { config: ChartConfig }
const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const ctx = React.useContext(ChartContext)
  if (!ctx) throw new Error('useChart must be used within a <ChartContainer />')
  return ctx
}

// --- Light wrapper for Recharts <ResponsiveContainer> with theme CSS vars ---
function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          'flex aspect-video justify-center text-xs',
          '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground',
          '[&_.recharts-cartesian-grid_line]:stroke-border/50',
          '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border',
          '[&_.recharts-sector]:outline-hidden',
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, cfg]) => cfg.theme || cfg.color
  )
  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : ''
  })
  .join('\n')}
}
`
          )
          .join('\n'),
      }}
    />
  )
}

// Expose native Tooltip wrapper for convenience (optional)
const ChartTooltip = RechartsPrimitive.Tooltip

// ---- Lightweight typings for tooltip/legend payload (avoid tight coupling) ----
type TooltipItem = {
  name?: string
  value?: number
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

type TooltipRenderProps = {
  active?: boolean
  payload?: TooltipItem[]
  label?: unknown
}

type LegendItem = {
  value?: string
  color?: string
  dataKey?: string | number
}

// --- Tooltip content ---
function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: TooltipRenderProps &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: 'line' | 'dot' | 'dashed'
    nameKey?: string
    labelKey?: string
    labelClassName?: string
    formatter?: (
      value: any,
      name: any,
      item: any,
      index: number,
      payload: any
    ) => React.ReactNode
    labelFormatter?: (value: any, payload?: any) => React.ReactNode
    color?: string
  }) {
  const { config } = useChart()
  const safePayload = Array.isArray(payload) ? payload : []

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !safePayload.length) return null
    const [first] = safePayload
    const key = `${labelKey || first?.dataKey || first?.name || 'value'}`
    const itemCfg = getPayloadConfigFromPayload(config, first, key)
    const value =
      !labelKey && typeof label === 'string'
        ? config[label as keyof typeof config]?.label || label
        : itemCfg?.label

    if (labelFormatter) {
      return (
        <div className={cn('font-medium', labelClassName)}>
          {labelFormatter(value, safePayload)}
        </div>
      )
    }
    if (!value) return null
    return <div className={cn('font-medium', labelClassName)}>{value}</div>
  }, [hideLabel, safePayload, labelKey, label, labelFormatter, labelClassName, config])

  if (!active || !safePayload.length) return null

  const nestLabel = safePayload.length === 1 && indicator !== 'dot'

  return (
    <div
      className={cn(
        'border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {safePayload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || 'value'}`
          const itemCfg = getPayloadConfigFromPayload(config, item, key)
          const indicatorColor = color || item?.payload?.['fill'] || item?.color

          return (
            <div
              key={`${item.dataKey}-${index}`}
              className={cn(
                'flex w-full flex-wrap items-stretch gap-2',
                indicator === 'dot' && 'items-center'
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item as any, index, item.payload)
              ) : (
                <>
                  {!hideIndicator && (
                    <div
                      className={cn('rounded-sm', {
                        'h-2.5 w-2.5': indicator === 'dot',
                        'w-1 h-3': indicator === 'line',
                        'w-0 h-3 border border-dashed bg-transparent':
                          indicator === 'dashed',
                      })}
                      style={{
                        backgroundColor: indicatorColor as string | undefined,
                        borderColor: indicatorColor as string | undefined,
                      }}
                    />
                  )}
                  <div className="flex flex-1 justify-between leading-none items-center">
                    <span className="text-muted-foreground">
                      {itemCfg?.label || item.name}
                    </span>
                    {item.value !== undefined && (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {Number(item.value).toLocaleString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Expose native Legend wrapper for convenience (optional)
const ChartLegend = RechartsPrimitive.Legend

// --- Legend content ---
function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: React.ComponentProps<'div'> & {
  hideIcon?: boolean
  nameKey?: string
  verticalAlign?: 'top' | 'bottom' | 'middle' | undefined
  payload?: LegendItem[] | unknown
}) {
  const { config } = useChart()
  const safePayload: LegendItem[] = Array.isArray(payload) ? (payload as LegendItem[]) : []

  if (!safePayload.length) return null

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className
      )}
    >
      {safePayload.map((item, index) => {
        const key = `${nameKey || item.dataKey || 'value'}`
        const itemCfg = getPayloadConfigFromPayload(config, item as any, key)
        return (
          <div
            key={`${item.value}-${index}`}
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            {!hideIcon && (
              <div
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
            )}
            {itemCfg?.label ?? item.value}
          </div>
        )
      })}
    </div>
  )
}

// --- helpers ---
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: any,
  key: string
) {
  if (typeof payload !== 'object' || payload === null) return undefined
  const inner = payload.payload ?? {}
  let configLabelKey = key

  if (typeof payload[key] === 'string') configLabelKey = payload[key]
  else if (typeof inner[key] === 'string') configLabelKey = inner[key]

  return config[configLabelKey] ?? config[key]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
