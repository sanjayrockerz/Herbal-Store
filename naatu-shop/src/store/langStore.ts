import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import en from '../translations/en.json'
import ta from '../translations/ta.json'

type Lang = 'en' | 'ta'

type DictValue = string | { [key: string]: DictValue }
type Dict = Record<string, DictValue>

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const dict: Record<Lang, Dict> = {
  en,
  ta,
}

const getTranslation = (dictionary: Dict, key: string): string | undefined => {
  const direct = dictionary[key]
  if (typeof direct === 'string') return direct

  let current: DictValue | undefined = dictionary
  for (const part of key.split('.')) {
    if (!current || typeof current === 'string') return undefined
    current = current[part]
  }

  return typeof current === 'string' ? current : undefined
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
      t: (key) => getTranslation(dict[get().lang], key) || getTranslation(dict.en, key) || key,
    }),
    { name: 'srisiddha-lang' },
  ),
)
