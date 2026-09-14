'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { animate, stagger } from 'animejs';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type AccentColor = 'emerald' | 'orange' | 'blue';

interface AnimatedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  className?: string;
  id?: string;
  accent?: AccentColor;
}

const accentStyles: Record<AccentColor, {
  ring: string;
  hoverBorder: string;
  selectedBg: string;
  selectedText: string;
  darkSelectedBg: string;
  darkSelectedText: string;
}> = {
  emerald: {
    ring: 'focus:ring-primary-500',
    hoverBorder: 'hover:border-primary-500',
    selectedBg: 'bg-primary-50',
    selectedText: 'text-primary-700',
    darkSelectedBg: 'dark:bg-primary-900/30',
    darkSelectedText: 'dark:text-primary-400',
  },
  orange: {
    ring: 'focus:ring-orange-500',
    hoverBorder: 'hover:border-orange-500',
    selectedBg: 'bg-orange-50',
    selectedText: 'text-orange-700',
    darkSelectedBg: 'dark:bg-orange-900/30',
    darkSelectedText: 'dark:text-orange-400',
  },
  blue: {
    ring: 'focus:ring-blue-500',
    hoverBorder: 'hover:border-blue-500',
    selectedBg: 'bg-blue-50',
    selectedText: 'text-blue-700',
    darkSelectedBg: 'dark:bg-blue-900/30',
    darkSelectedText: 'dark:text-blue-400',
  },
};

export function AnimatedSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  disabled = false,
  required = false,
  label,
  className = '',
  id,
  accent = 'emerald',
}: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const availableOptions = options.filter((opt) => !opt.disabled);
  const accentClass = accentStyles[accent];

  const closeDropdown = useCallback(() => {
    if (!dropdownRef.current) {
      setIsOpen(false);
      return;
    }

    animate(dropdownRef.current, {
      opacity: [1, 0],
      translateY: [0, -8],
      scale: [1, 0.96],
      duration: 200,
      ease: 'inCubic',
      onComplete: () => setIsOpen(false),
    });
  }, []);

  const positionDropdown = useCallback(() => {
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

  useLayoutEffect(() => {
    if (!isOpen || !portalEl) return;

    document.body.appendChild(portalEl);
    positionDropdown();

    const handleReposition = () => positionDropdown();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      if (portalEl.parentNode) {
        document.body.removeChild(portalEl);
      }
    };
  }, [isOpen, portalEl, positionDropdown]);

  useEffect(() => {
    if (!isOpen || !portalEl) return;

    if (dropdownRef.current) {
      animate(dropdownRef.current, {
        opacity: [0, 1],
        translateY: [-12, 0],
        scale: [0.96, 1],
        duration: 280,
        ease: 'outBack(1.5)',
      });
    }

    if (optionsRef.current) {
      const items = optionsRef.current.querySelectorAll('[data-option]');
      if (items.length > 0) {
        animate(items, {
          opacity: [0, 1],
          translateX: [-10, 0],
          duration: 280,
          delay: stagger(35),
          ease: 'outCubic',
        });
      }
    }
  }, [isOpen, portalEl]);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      closeDropdown();
    } else {
      if (!portalEl) {
        setPortalEl(document.createElement('div'));
      }
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    closeDropdown();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(availableOptions[highlightedIndex].value);
        } else {
          handleToggle();
        }
        break;
      case 'Escape':
        if (isOpen) closeDropdown();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            prev < availableOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Tab':
        if (isOpen) closeDropdown();
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <button
        type="button"
        id={id}
        ref={buttonRef}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left border rounded-lg outline-none transition-colors ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
            : `bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 ${accentClass.hoverBorder} ${accentClass.ring}${isOpen ? ` ${accentClass.selectedBg} ${accentClass.darkSelectedBg} ring-2 ${accentClass.ring}` : ''}`
        }`}
      >
        <span className={selectedOption ? '' : 'text-slate-400 dark:text-slate-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {required && !value && (
        <input type="hidden" required value={value} onChange={() => {}} />
      )}

      {isOpen && portalEl && createPortal(
        <div
          ref={dropdownRef}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden origin-top"
          style={{ ...dropdownStyle, opacity: 0 }}
        >
          <div ref={optionsRef} className="max-h-60 overflow-y-auto py-1" role="listbox">
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;
              const isDisabled = option.disabled;

              return (
                <div
                  key={option.value}
                  data-option
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => !isDisabled && handleSelect(option.value)}
                  className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${
                    isDisabled
                      ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : isSelected
                      ? `${accentClass.selectedBg} ${accentClass.darkSelectedBg} ${accentClass.selectedText} ${accentClass.darkSelectedText}`
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className={`w-4 h-4 ${accentClass.selectedText} ${accentClass.darkSelectedText}`} />}
                </div>
              );
            })}
          </div>
        </div>,
        portalEl
      )}
    </div>
  );
}
