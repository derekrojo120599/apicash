interface ThemeSelectorProps {
  value: string
  onChange: (tema: string) => void
  disabled?: boolean
}

const temas = [
  { id: 'emerald', nombre: 'Esmeralda', color: 'bg-emerald-500' },
  { id: 'rose', nombre: 'Rosa Cuarzo', color: 'bg-rose-500' },
  { id: 'violet', nombre: 'Lavanda', color: 'bg-violet-500' },
  { id: 'orange', nombre: 'Coral', color: 'bg-orange-500' },
  { id: 'blue', nombre: 'Azul Océano', color: 'bg-blue-500' },
  { id: 'amber', nombre: 'Dorado Ámbar', color: 'bg-amber-500' },
]

export function ThemeSelector({ value, onChange, disabled }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {temas.map((tema) => (
        <button
          key={tema.id}
          type="button"
          onClick={() => onChange(tema.id)}
          disabled={disabled}
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
            value === tema.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500'
              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className={`w-6 h-6 rounded-full ${tema.color}`} />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{tema.nombre}</span>
        </button>
      ))}
    </div>
  )
}
