'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus, Search } from 'lucide-react';
import { useCrearCategoria, Categoria } from '@/hooks/useAuxiliares';

interface CreatableCategorySelectProps {
  value: string;
  onChange: (categoryId: string) => void;
  categories: Categoria[];
  tipo: 'gasto' | 'ingreso';
  placeholder?: string;
  disabled?: boolean;
}

export function CreatableCategorySelect({
  value,
  onChange,
  categories,
  tipo,
  placeholder = 'Seleccionar Categoría...',
  disabled = false,
}: CreatableCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: createCategory } = useCrearCategoria();

  // Filter categories matching current transaction type (gasto / ingreso)
  const typeCategories = categories.filter((c) => c.tipo === tipo);

  // Filter matching search term
  const filteredCategories = typeCategories.filter((c) =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const selectedCategory = categories.find((c) => c.id === value);

  // Check if search term is a non-empty string that does not match any existing category exactly
  const trimmedSearch = searchTerm.trim();
  const exactMatchExists = typeCategories.some(
    (c) => c.nombre.toLowerCase() === trimmedSearch.toLowerCase()
  );
  const canCreate = trimmedSearch.length > 0 && !exactMatchExists;

  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideButton = !buttonRef.current?.contains(target);
      const isOutsideDropdown = !dropdownRef.current?.contains(target);
      if (isOutsideButton && isOutsideDropdown) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  // Handle portal mount and reposition on scroll or resize
  useLayoutEffect(() => {
    if (!isOpen || !portalElement) return;

    document.body.appendChild(portalElement);
    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    // Auto-focus search input when opening
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      if (portalElement.parentNode) {
        document.body.removeChild(portalElement);
      }
    };
  }, [isOpen, portalElement, updateDropdownPosition]);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      closeDropdown();
    } else {
      if (!portalElement) {
        setPortalElement(document.createElement('div'));
      }
      setIsOpen(true);
      setSearchTerm('');
    }
  };

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    closeDropdown();
  };

  const handleCreateNewCategory = async () => {
    if (!canCreate) return;

    try {
      const newCategory = await createCategory({
        nombre: trimmedSearch,
        tipo,
      });

      if (newCategory?.id) {
        onChange(newCategory.id);
      }
      closeDropdown();
    } catch (err) {
      console.error('Failed to create category on the fly:', err);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left border rounded-lg outline-none transition-colors ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
            : `bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-primary-500 focus:ring-2 focus:ring-primary-500 ${
                isOpen ? 'border-primary-500 ring-2 ring-primary-500 bg-primary-50/50 dark:bg-primary-900/20' : ''
              }`
        }`}
      >
        <span className={selectedCategory ? 'font-medium' : 'text-slate-400 dark:text-slate-500'}>
          {selectedCategory?.nombre || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Hidden input for HTML form validation */}
      <input type="hidden" required value={value} onChange={() => {}} />

      {isOpen && portalElement && createPortal(
        <div
          ref={dropdownRef}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={dropdownStyle}
        >
          {/* Search bar inside dropdown */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/50">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (canCreate) {
                    handleCreateNewCategory();
                  } else if (filteredCategories.length > 0) {
                    handleSelect(filteredCategories[0].id);
                  }
                } else if (e.key === 'Escape') {
                  closeDropdown();
                }
              }}
              placeholder="Buscar o escribir nueva..."
              className="w-full text-sm bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Quick Create option if text doesn't exist */}
          {canCreate && (
            <div className="p-1 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/30">
              <button
                type="button"
                onClick={handleCreateNewCategory}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-medium transition-colors text-left"
              >
                <div className="flex items-center gap-2 truncate">
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    Crear <strong>&quot;{trimmedSearch}&quot;</strong>
                  </span>
                </div>
                <span className="text-xs bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                  Enter ↵
                </span>
              </button>
            </div>
          )}

          {/* Categories list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredCategories.length === 0 && !canCreate ? (
              <div className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">
                No hay categorías disponibles
              </div>
            ) : (
              filteredCategories.map((category) => {
                const isSelected = category.id === value;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelect(category.id)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span>{category.nombre}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        portalElement
      )}
    </div>
  );
}
