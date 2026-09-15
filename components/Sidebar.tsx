'use client'

import Link from 'next/link'
import { Home, Inbox, Users, BookOpen, Mail, BarChart3, CheckSquare } from 'lucide-react'

export default function Sidebar() {
  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: Inbox, label: 'Leads', href: '/leads' },
    { icon: Users, label: 'Clients', href: '/clients' },
    { icon: BookOpen, label: 'Contenu', href: '/contenu' },
    { icon: CheckSquare, label: 'Tâches', href: '/taches' },
    { icon: Mail, label: 'Newsletters', href: '/newsletters' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  ]

  return (
    <div className="w-64 bg-wine text-white flex flex-col border-r">
      <div className="p-4">
        <h1 className="font-bold text-lg">La Gabare</h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-wine/80 transition"
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
  )
}
