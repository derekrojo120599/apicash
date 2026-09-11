'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, WalletCards, ArrowRightLeft, Target, PiggyBank, Receipt, User, LogOut, FolderOpen, Menu, X, BookOpen } from 'lucide-react'
import { logout } from '../(auth)/actions'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AnimatedNavLink, StaggerContainer, AnimatedButton } from '@/components/animations'
import { animate } from 'animejs'

import { InstallPrompt } from '@/components/InstallPrompt'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Cuentas', href: '/cuentas', icon: WalletCards },
  { name: 'Movimientos', href: '/transacciones', icon: ArrowRightLeft },
  { name: 'Presupuesto', href: '/presupuesto', icon: Target },
  { name: 'Categorías', href: '/categorias', icon: FolderOpen },
  { name: 'Ahorros', href: '/ahorros', icon: PiggyBank },
  { name: 'Deudas', href: '/deudas', icon: Receipt },
  { name: 'Guía', href: '/guia', icon: BookOpen },
  { name: 'Perfil', href: '/perfil', icon: User },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    if (overlayRef.current) {
      animate(overlayRef.current, {
        opacity: [0, 1],
        duration: 300,
        ease: 'outQuad',
      });
    }

    if (drawerRef.current) {
      animate(drawerRef.current, {
        translateX: ['-100%', '0%'],
        duration: 350,
        ease: 'outCubic',
      });
    }
  }, [mobileSidebarOpen]);

  const handleCloseMobileSidebar = () => {
    const animations: { pause: () => void }[] = [];

    if (overlayRef.current) {
      const a = animate(overlayRef.current, {
        opacity: [1, 0],
        duration: 250,
        ease: 'inQuad',
      });
      animations.push(a);
    }

    if (drawerRef.current) {
      const a = animate(drawerRef.current, {
        translateX: ['0%', '-100%'],
        duration: 300,
        ease: 'inCubic',
      });
      animations.push(a);
    }

    setTimeout(() => {
      setMobileSidebarOpen(false);
    }, 300);

    return () => {
      animations.forEach(a => a.pause());
    };
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
        <div className="p-4 md:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
              <WalletCards className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-bold text-lg md:text-xl text-slate-900 dark:text-white">Apicash</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-3 mt-2">
          <StaggerContainer
            as="nav"
            className="space-y-0.5"
            staggerDelay={60}
            duration={400}
            direction="right"
            distance={16}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <AnimatedNavLink
                  data-anime
                  key={item.name}
                  href={item.href}
                  icon={<item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`} />}
                  label={item.name}
                  isActive={isActive}
                  className={`flex items-center gap-3 px-3 py-2.5 md:py-2.5 rounded-lg transition-colors text-sm md:text-base ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
                  }`}
                />
              )
            })}
          </StaggerContainer>
        </div>

        <div className="p-3 shrink-0 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <AnimatedButton
            variant="ghost"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:text-red-700 dark:text-slate-400 dark:hover:text-red-400 justify-start text-sm md:text-base"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
            <span>Cerrar sesión</span>
          </AnimatedButton>
        </div>
      </aside>

      {/* Main Content area */}
      <main className="flex-1 overflow-y-auto dark:bg-slate-950 transition-colors">
        {/* Mobile Header (Only visible on small screens) */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-lg">
              <WalletCards className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">Apicash</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 rounded-lg transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
        {children}
      </main>

      {/* Prompts and Overlays */}
      <InstallPrompt />

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <>
          <div
            ref={overlayRef}
            className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 z-40 md:hidden"
            style={{ opacity: 0 }}
            onClick={handleCloseMobileSidebar}
          />
          <aside
            ref={drawerRef}
            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col md:hidden"
            style={{ transform: 'translateX(-100%)' }}
          >
            <div className="p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                  <WalletCards className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-bold text-lg text-slate-900 dark:text-white">Apicash</span>
              </div>
              <button
                onClick={handleCloseMobileSidebar}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-3 mt-2">
              <StaggerContainer
                as="nav"
                className="space-y-0.5"
                staggerDelay={60}
                duration={350}
                direction="right"
                distance={16}
              >
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <AnimatedNavLink
                      data-anime
                      key={item.name}
                      href={item.href}
                      onClick={handleCloseMobileSidebar}
                      icon={<item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`} />}
                      label={item.name}
                      isActive={isActive}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
                      }`}
                    />
                  )
                })}
              </StaggerContainer>
            </div>

            <div className="p-3 shrink-0 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <ThemeToggle />
              <AnimatedButton
                variant="ghost"
                onClick={() => {
                  handleCloseMobileSidebar();
                  logout();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:text-red-700 dark:text-slate-400 dark:hover:text-red-400 justify-start text-sm"
              >
                <LogOut className="w-5 h-5 text-slate-400" />
                Cerrar sesión
              </AnimatedButton>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
