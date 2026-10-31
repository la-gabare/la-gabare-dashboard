'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Target, Users, BookOpen, CheckSquare } from 'lucide-react'

const navItems = [
  { icon: Home, label: 'Aujourd\'hui', court: 'Accueil', href: '/' },
  { icon: Target, label: 'Pipeline', court: 'Pipeline', href: '/pipeline' },
  { icon: Users, label: 'Clients', court: 'Clients', href: '/clients' },
  { icon: BookOpen, label: 'Contenu', court: 'Contenu', href: '/contenu' },
  { icon: CheckSquare, label: 'Tâches', court: 'Tâches', href: '/taches' },
]

export default function Sidebar() {
  const pathname = usePathname() || '/'
  const actif = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <>
      {/* Ordinateur : menu latéral */}
      <div className="hidden md:flex w-64 bg-wine text-white flex-col border-r shrink-0">
        <div className="p-4">
          <h1 className="font-bold text-lg">La Gabare</h1>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-wine/80 transition ${actif(item.href) ? 'bg-white/15 font-semibold' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-wine/30">
          <p className="text-xs text-wine/80">La Gabare</p>
        </div>
      </div>

      {/* Téléphone : barre du haut + menu en bas */}
      <header className="md:hidden bg-wine text-white px-4 py-3 shrink-0">
        <h1 className="font-bold text-lg">La Gabare</h1>
      </header>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-wine text-white border-t border-white/20 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[11px] ${actif(item.href) ? 'bg-white/15 font-semibold' : 'opacity-80'}`}
          >
            <item.icon size={22} />
            <span>{item.court}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
