export function nameCase(input: string | null | undefined, locale: string = 'es'): string {
  const s = (input || '').trim()
  if (!s) return ''
  // Normaliza espacios y capitaliza por palabras y subpalabras separadas por '-' o "'"
  return s
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) =>
      word
        .split(/([-'’])/)
        .map((chunk, idx, arr) => {
          // keep delimiters as-is
          if (chunk === '-' || chunk === "'" || chunk === '’') return chunk
          if (!chunk) return chunk
          const lower = chunk.toLocaleLowerCase(locale)
          // Preserve lowercase connectors like "de", "del", "la", "y" si no es la primera palabra
          const connectors = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y'])
          const isConnector = connectors.has(lower)
          const isFirstWord = arr === undefined // not used here
          // Capitalize all subchunks regardless; connectors rule could be applied only for mid words if needed
          return lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1)
        })
        .join('')
    )
    .join(' ')
}

