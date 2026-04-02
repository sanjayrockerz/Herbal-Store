import { Leaf, Phone, Mail, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLangStore } from '../store/langStore'

export default function Footer() {
  const { t } = useLangStore()

  return (
    <footer className="bg-forestDark text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-sageDark rounded-xl flex items-center justify-center"><Leaf size={18} className="text-white" /></div>
            <p className="font-bold text-white text-lg font-headline">Sri Siddha</p>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">{t('footer.desc')}</p>
          <p className="text-xs text-sage font-bold uppercase tracking-wider">{t('footer.tags')}</p>
        </div>
        <div>
          <h5 className="text-white font-bold mb-5 uppercase text-xs tracking-widest">{t('footer.shop')}</h5>
          <ul className="flex flex-col gap-2.5 text-sm">
            {['Herbal Powder', 'Herbal Oil', 'Herbal Root', 'Herbal Spice', 'Herbal Tablet'].map(c => (
              <li key={c}><Link to={`/products?cat=${encodeURIComponent(c)}`} className="hover:text-sage transition-colors">{t('cat.' + c)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="text-white font-bold mb-5 uppercase text-xs tracking-widest">{t('footer.remedies')}</h5>
          <ul className="flex flex-col gap-2.5 text-sm">
            {['Cold & Cough', 'Digestion', 'Hair Growth', 'Immunity', 'Skin Care', 'Stress'].map(r => (
              <li key={r}><Link to={`/products?remedy=${encodeURIComponent(r)}`} className="hover:text-sage transition-colors">{t('remedy.' + r)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="text-white font-bold mb-5 uppercase text-xs tracking-widest">{t('footer.contact')}</h5>
          <ul className="flex flex-col gap-4 text-sm">
            <li className="flex items-start gap-3"><MapPin size={15} className="text-sage mt-0.5 shrink-0" /><span>123 Herbal Valley, Nature Hub District, Tamil Nadu 600001</span></li>
            <li className="flex items-center gap-3"><Phone size={15} className="text-sage shrink-0" /><span>+91 98765 43210</span></li>
            <li className="flex items-center gap-3"><Mail size={15} className="text-sage shrink-0" /><span>support@srisiddha.in</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-gray-500">
        {t('footer.rights')}
      </div>
    </footer>
  )
}
