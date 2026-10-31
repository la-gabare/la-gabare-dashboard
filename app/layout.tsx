import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#722F37' }

export const metadata: Metadata = {
  title: 'La Gabare Dashboard',
  description: 'Admin Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50">
        <div className="flex flex-col md:flex-row h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
