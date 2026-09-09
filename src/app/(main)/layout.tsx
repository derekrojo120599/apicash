'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, WalletCards, ArrowRightLeft, Target, PiggyBank, Receipt, User, LogOut, FolderOpen, MoreHorizontal } from 'lucide-react'
import { logout } from '../(auth)/actions'
import { ThemeToggle } from '@/components/ThemeToggle'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Cuentas', href: '/cuentas', icon: WalletCards },
  { name: 'Movimientos', href: '/transacciones', icon: ArrowRightLeft },
  { name: 'Presupuesto', href: '/presupuesto', icon: Target },
  { name: 'Categorías', href: '/categorias', icon: FolderOpen },
  { name: 'Ahorros', href: '/ahorros', icon: PiggyBank },
  { name: 'Deudas', href: '/deudas', icon: Receipt },
  { name: 'Perfil', href: '/perfil', icon: User },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
              <WalletCards className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-bold text-xl text-slate-900 dark:text-white">Control</span>
          </div>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <button
            onClick={() => logout()}
            className="flex w-full items-center justify-center md:justify-start gap-3 px-3 py-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-600 dark:text-slate-500 dark:group-hover:text-red-400" />
            <span className="hidden md:inline">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content area */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 dark:bg-slate-950 transition-colors">
        {/* Mobile Header (Only visible on small screens) */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-lg">
              <WalletCards className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">Control</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
        {children}
      </main>

      {/* Mobile Bottom Bar & More Menu */}
      <div className="md:hidden">
        {showMoreMenu && (
          <>
            <div 
              className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 z-40 transition-opacity"
              onClick={() => setShowMoreMenu(false)}
            />
            <div className="fixed bottom-[72px] left-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden pb-safe">
              <div className="p-2">
                {navItems.filter(item => !['Dashboard', 'Presupuesto', 'Movimientos', 'Deudas'].includes(item.name)).map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setShowMoreMenu(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      {item.name}
                    </Link>
                  )
                })}
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-2" />
                <button
                  onClick={() => {
                    setShowMoreMenu(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-5 h-5 text-slate-400" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </>
        )}

        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around p-2 pb-safe z-50 transition-colors">
          {navItems.filter(item => ['Dashboard', 'Presupuesto', 'Movimientos', 'Deudas'].includes(item.name)).map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setShowMoreMenu(false)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'fill-emerald-50/50 dark:fill-emerald-900/50' : ''}`} />
                <span className="text-[10px] mt-1 font-medium">{item.name}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] ${
              showMoreMenu ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <MoreHorizontal className={`w-6 h-6 ${showMoreMenu ? 'fill-emerald-50/50 dark:fill-emerald-900/50' : ''}`} />
            <span className="text-[10px] mt-1 font-medium">Más</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
