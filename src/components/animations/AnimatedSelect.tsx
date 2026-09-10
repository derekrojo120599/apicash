'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { animate, stagger } from 'animejs';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

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
}

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
}: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const availableOptions = options.filter((opt) => !opt.disabled);

  const closeDropdown = useCallback(() => {
    if (!dropdownRef.current) {
      setIsOpen(false);
      return;
    }

    animate(dropdownRef.current, {
      opacity: [1, 0],
      translateY: [0, -8],
      duration: 200,
      ease: 'inCubic',
      onComplete: () => setIsOpen(false),
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  useEffect(() => {
    if (!isOpen) return;

    if (dropdownRef.current) {
      animate(dropdownRef.current, {
        opacity: [0, 1],
        translateY: [-8, 0],
        duration: 250,
        ease: 'outCubic',
      });
    }

    if (optionsRef.current) {
      const items = optionsRef.current.querySelectorAll('[data-option]');
      if (items.length > 0) {
        animate(items, {
          opacity: [0, 1],
          translateX: [-8, 0],
          duration: 250,
          delay: stagger(30),
          ease: 'outCubic',
        });
      }
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      closeDropdown();
    } else {
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
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left border rounded-lg outline-none transition-colors ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
            : 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500'
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

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden"
          style={{ opacity: 0 }}
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
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
