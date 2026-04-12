import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import en from '../translations/en.json'
import ta from '../translations/ta.json'

type Lang = 'en' | 'ta'

type Dict = Record<string, string>

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

/* Flatten nested JSON into dot-separated keys */
function flatten(obj: any, prefix = ''): Dict {
  const result: Dict = {}
  for (const k in obj) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      Object.assign(result, flatten(obj[k], key))
    } else {
      result[key] = String(obj[k])
    }
  }
  return result
}

const dict: Record<Lang, Dict> = {
  en: flatten(en),
  ta: flatten(ta),
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
      t: (key) => dict[get().lang]?.[key] || dict.en?.[key] || key,
    }),
    { name: 'srisiddha-lang' },
  ),
)
