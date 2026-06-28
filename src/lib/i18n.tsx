import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'pt'

const STORAGE_KEY = 'lang'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
}

const LanguageContext = createContext<LanguageContextValue>(null!)

function readStored(): Lang {
  if (typeof window === 'undefined') return 'pt'
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'en' || v === 'pt' ? v : 'pt'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readStored)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

const flags = [
  { lang: 'pt' as const, flag: '🇵🇹', label: 'PT' },
  { lang: 'en' as const, flag: '🇬🇧', label: 'EN' },
]

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()
  return (
    <div className="flex gap-1">
      {flags.map(f => (
        <button
          key={f.lang}
          onClick={() => setLang(f.lang)}
          aria-pressed={lang === f.lang}
          title={f.label}
          className={`font-jet flex cursor-pointer items-center gap-1.5 rounded-[3px] border px-2 py-1 text-[12px] font-bold uppercase tracking-[0.16em] transition-colors ${
            lang === f.lang
              ? 'border-ipsc-accent bg-ipsc-accent/10 text-ipsc-accent'
              : 'border-ipsc-line2 text-ipsc-muted2 hover:border-ipsc-line2 hover:text-ipsc-text'
          }`}
        >
          <span className="text-sm leading-none">{f.flag}</span>
          {f.label}
        </button>
      ))}
    </div>
  )
}
