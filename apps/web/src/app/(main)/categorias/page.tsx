'use client'

import { useState, useMemo } from 'react'
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory, Category } from '@/hooks/useCategories'
import { useToast } from '@/hooks/useToast'
import { FolderOpen, Plus, X, Trash2, Pencil, Search, TrendingDown, TrendingUp, Layers } from 'lucide-react'
import { FadeIn, StaggerContainer, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedSelect } from '@/components/animations'

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const { mutateAsync: createCategory } = useCreateCategory()
  const { mutateAsync: updateCategory } = useUpdateCategory()
  const { mutateAsync: deleteCategory, isPending: isDeleting } = useDeleteCategory()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'todos' | 'gasto' | 'ingreso'>('todos')

  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'gasto' as 'gasto' | 'ingreso' | 'ahorro' | 'deuda'
  })

  const { error: toastError } = useToast()

  // Conteo de categorías por tipo
  const counts = useMemo(() => {
    const total = categories?.length || 0
    const gastos = categories?.filter(c => c.tipo === 'gasto').length || 0
    const ingresos = categories?.filter(c => c.tipo === 'ingreso').length || 0
    return { total, gastos, ingresos }
  }, [categories])

  // Filtrado reactivo por pestaña y término de búsqueda
  const filteredCategories = useMemo(() => {
    if (!categories) return []
    return categories.filter(category => {
      const matchesTab = selectedTab === 'todos' || category.tipo === selectedTab
      const matchesSearch = category.nombre.toLowerCase().includes(searchQuery.trim().toLowerCase())
      return matchesTab && matchesSearch
    })
  }, [categories, selectedTab, searchQuery])

  const openCreate = (tipoDefault?: 'gasto' | 'ingreso') => {
    setEditingCategory(null)
    setFormData({ nombre: '', tipo: tipoDefault || (selectedTab === 'ingreso' ? 'ingreso' : 'gasto') })
    setError('')
    setModalOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({ nombre: category.nombre, tipo: category.tipo })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const isEdit = !!editingCategory
    const editId = editingCategory?.id
    setModalOpen(false)
    try {
      if (isEdit && editId) {
        await updateCategory({ id: editId, updates: { nombre: formData.nombre } })
      } else {
        await createCategory(formData)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isEdit ? 'Error al editar la categoría' : 'Error al crear la categoría')
      setError(message)
      setModalOpen(true)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Confirma la eliminación de esta categoría? Solo es posible si no posee transacciones asociadas.')) {
      try {
        await deleteCategory(id)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al eliminar. Es posible que tenga transacciones.'
        toastError({ title: 'Error al eliminar', message })
      }
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <FadeIn as="header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Categorías</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Administración de clasificaciones de movimientos</p>
        </div>
        <AnimatedButton onClick={() => openCreate()}>
          <Plus className="w-5 h-5" />
          Nueva Categoría
        </AnimatedButton>
      </FadeIn>

      {/* Control Bar: Pestañas de filtrado + Buscador */}
      <FadeIn delay={50}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl gap-1">
            <button
              onClick={() => setSelectedTab('todos')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTab === 'todos'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todas</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => setSelectedTab('gasto')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTab === 'gasto'
                  ? 'bg-red-500 text-white shadow-sm shadow-red-500/20'
                  : 'text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Gastos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedTab === 'gasto' ? 'bg-red-600/80 text-white' : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'}`}>
                {counts.gastos}
              </span>
            </button>

            <button
              onClick={() => setSelectedTab('ingreso')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTab === 'ingreso'
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                  : 'text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Ingresos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedTab === 'ingreso' ? 'bg-primary-700/80 text-white' : 'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300'}`}>
                {counts.ingresos}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar categoría..."
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-slate-100 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Main List */}
      {isLoading ? (
        <div className="flex justify-center p-12"><AnimatedLoader size={40} color="#10b981" /></div>
      ) : categories?.length === 0 ? (
        <FadeIn>
          <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm flex flex-col items-center cursor-default">
            <FolderOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">No hay categorías registradas</p>
            <p className="text-sm mt-1 mb-6">Cree categorías para organizar mejor sus finanzas.</p>
            <AnimatedButton variant="secondary" onClick={() => openCreate()}>
              Crear primera categoría
            </AnimatedButton>
          </AnimatedCard>
        </FadeIn>
      ) : filteredCategories.length === 0 ? (
        <FadeIn>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 shadow-sm">
            <Search className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-medium text-slate-800 dark:text-slate-200">No se encontraron categorías</p>
            <p className="text-xs text-slate-400 mt-1">
              No hay coincidencias para &quot;{searchQuery}&quot; en la pestaña seleccionada.
            </p>
          </div>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5" staggerDelay={40}>
          {filteredCategories.map(category => (
            <AnimatedCard
              data-anime
              key={category.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-4 shadow-sm hover:shadow-md flex justify-between items-center cursor-default group transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2.5 h-8 rounded-full shrink-0 ${
                  category.tipo === 'ingreso' ? 'bg-primary-500' :
                  category.tipo === 'gasto' ? 'bg-red-500' :
                  'bg-blue-500'
                }`} />
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm">
                    {category.nombre}
                  </h3>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md mt-1 inline-block ${
                    category.tipo === 'ingreso' ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/50' :
                    category.tipo === 'gasto' ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/50' :
                    'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50'
                  }`}>
                    {category.tipo === 'gasto' ? 'Gasto' : category.tipo === 'ingreso' ? 'Ingreso' : category.tipo}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(category)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  title="Editar categoría"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  disabled={isDeleting}
                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  title="Eliminar categoría"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </AnimatedCard>
          ))}
        </StaggerContainer>
      )}

      {/* Modal crear / editar categoría */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-visible border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800/60">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
                  placeholder="Ej: Gimnasio, Freelance, Mascotas..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
                <AnimatedSelect
                  value={formData.tipo}
                  onChange={(v) => setFormData({...formData, tipo: v as typeof formData.tipo})}
                  options={[
                    { value: 'gasto', label: 'Gasto' },
                    { value: 'ingreso', label: 'Ingreso' },
                  ]}
                  placeholder="Seleccione un tipo"
                  disabled={!!editingCategory}
                  accent="emerald"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/50">
                  {error}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex justify-center items-center"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
