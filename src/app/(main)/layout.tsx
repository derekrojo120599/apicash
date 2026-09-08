'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, WalletCards, ArrowRightLeft, Target, PiggyBank, Receipt, User, LogOut } from 'lucide-react'
import { logout } from '../(auth)/actions'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Cuentas', href: '/cuentas', icon: WalletCards },
  { name: 'Movimientos', href: '/transacciones', icon: ArrowRightLeft },
  { name: 'Presupuesto', href: '/presupuesto', icon: Target },
  { name: 'Ahorros', href: '/ahorros', icon: PiggyBank },
  { name: 'Deudas', href: '/deudas', icon: Receipt },
  { name: 'Perfil', href: '/perfil', icon: User },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <WalletCards className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="font-bold text-xl text-slate-900">Control USD/VES</span>
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
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content area */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-safe z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center p-2 rounded-lg ${
                isActive ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'fill-emerald-50/50' : ''}`} />
              <span className="text-[10px] mt-1 font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
