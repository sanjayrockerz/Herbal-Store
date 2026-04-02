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

const dict: Record<Lang, Dict> = {
  en,
  ta,
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
