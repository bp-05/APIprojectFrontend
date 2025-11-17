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
        .map((chunk) => {
          if (chunk === '-' || chunk === "'" || chunk === '’') return chunk
          if (!chunk) return chunk
          const lower = chunk.toLocaleLowerCase(locale)
          return lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1)
        })
        .join('')
    )
    .join(' ')
}

