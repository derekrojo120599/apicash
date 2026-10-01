'use client'

import { useState } from 'react'
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory, Category } from '@/hooks/useCategories'
import { useToast } from '@/hooks/useToast'
import { FolderOpen, Plus, X, Loader2, Trash2, Pencil } from 'lucide-react'
import { FadeIn, StaggerContainer, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedSelect } from '@/components/animations'

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const { mutateAsync: createCategory } = useCreateCategory()
  const { mutateAsync: updateCategory } = useUpdateCategory()
  const { mutateAsync: deleteCategory, isPending: isDeleting } = useDeleteCategory()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'gasto' as 'gasto' | 'ingreso' | 'ahorro' | 'deuda'
  })

  const { error: toastError } = useToast()

  const openCreate = () => {
    setEditingCategory(null)
    setFormData({ nombre: '', tipo: 'gasto' })
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
    setModalOpen(false) // Cerrar modal antes del mutate optimista
    try {
      if (isEdit && editId) {
        await updateCategory({ id: editId, updates: { nombre: formData.nombre } })
      } else {
        await createCategory(formData)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isEdit ? 'Error al editar la categoría' : 'Error al crear la categoría')
      setError(message)
      setModalOpen(true) // Reabrir si falla
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
      <FadeIn as="header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Categorías</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Administración de clasificaciones de movimientos</p>
        </div>
        <AnimatedButton onClick={openCreate}>
          <Plus className="w-5 h-5" />
          Nueva Categoría
        </AnimatedButton>
      </FadeIn>

      {isLoading ? (
        <div className="flex justify-center p-12"><AnimatedLoader size={40} color="#10b981" /></div>
      ) : categories?.length === 0 ? (
        <FadeIn>
          <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm flex flex-col items-center cursor-default">
            <FolderOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">No hay categorías</p>
            <p className="text-sm mt-1 mb-6">Cree categorías para organizar mejor sus finanzas.</p>
            <AnimatedButton variant="secondary" onClick={openCreate}>
              Crear primera categoría
            </AnimatedButton>
          </AnimatedCard>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" staggerDelay={80}>
          {categories?.map(category => (
            <AnimatedCard
              data-anime
              key={category.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex justify-between items-center cursor-default group"
            >
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-200">{category.nombre}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-2 inline-block ${
                  category.tipo === 'ingreso' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' :
                  category.tipo === 'gasto' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {category.tipo.charAt(0).toUpperCase() + category.tipo.slice(1)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(category)}
                  className="p-2 text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                  title="Editar categoría"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  disabled={isDeleting}
                  className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 transition-all"
                  title="Eliminar categoría"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </AnimatedCard>
          ))}
        </StaggerContainer>
      )}

      {/* Create category modal */}
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
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  {editingCategory ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
