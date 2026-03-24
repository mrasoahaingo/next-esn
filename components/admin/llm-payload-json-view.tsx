'use client'

import { useMemo, type CSSProperties } from 'react'
import JsonView from '@uiw/react-json-view'
import { darkTheme } from '@uiw/react-json-view/dark'
import { lightTheme } from '@uiw/react-json-view/light'
import { useTheme } from 'next-themes'

function normalizeForJsonView(value: unknown): object | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return value as object
  return { valeur: value }
}

/** Thème aligné sur le panneau (fond transparent pour s’intégrer au dialog). */
function useJsonViewTheme(): CSSProperties {
  const { resolvedTheme } = useTheme()
  return useMemo(() => {
    const base = resolvedTheme === 'light' ? lightTheme : darkTheme
    return {
      ...base,
      '--w-rjv-background-color': 'transparent',
    } as CSSProperties
  }, [resolvedTheme])
}

export function LlmPayloadJsonView({
  label,
  value,
}: {
  label: string
  value: unknown
}) {
  const jsonStyle = useJsonViewTheme()
  const normalized = useMemo(() => normalizeForJsonView(value), [value])

  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</p>
      {normalized === null ? (
        <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Aucune donnée
        </p>
      ) : (
        <div className="max-h-[40vh] overflow-auto rounded-lg border border-border/60 bg-muted/20 p-2 text-left">
          <JsonView
            value={normalized}
            style={jsonStyle}
            collapsed={2}
            displayDataTypes={false}
            displayObjectSize
            enableClipboard
            shortenTextAfterLength={0}
            indentWidth={14}
            className="text-xs leading-relaxed"
          />
        </div>
      )}
    </div>
  )
}
