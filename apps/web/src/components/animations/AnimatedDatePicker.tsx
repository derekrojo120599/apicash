'use client';

import { Calendar } from 'lucide-react';
import { AnimatedSelect } from './AnimatedSelect';

type AccentColor = 'emerald' | 'orange' | 'blue';

interface AnimatedDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  className?: string;
  id?: string;
  accent?: AccentColor;
}

const MESES = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function parseDate(value: string): { day: string; month: string; year: string } {
  if (!value) return { day: '', month: '', year: '' };
  const [year, month, day] = value.split('-');
  return { day: day || '', month: month || '', year: year || '' };
}

function getDaysInMonth(year: string, month: string): number {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m) return 31;
  return new Date(y, m, 0).getDate();
}

export function AnimatedDatePicker({
  value,
  onChange,
  disabled = false,
  required = false,
  label,
  className = '',
  id,
  accent = 'emerald',
}: AnimatedDatePickerProps) {
  const { day, month, year } = parseDate(value);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) => {
    const y = currentYear - 10 + i;
    return { value: y.toString(), label: y.toString() };
  });

  const maxDay = getDaysInMonth(year, month);
  const dayOptions = Array.from({ length: maxDay }, (_, i) => ({
    value: pad(i + 1),
    label: pad(i + 1),
  }));

  const handleChange = (field: 'day' | 'month' | 'year', fieldValue: string) => {
    const newDay = field === 'day' ? fieldValue : day;
    const newMonth = field === 'month' ? fieldValue : month;
    const newYear = field === 'year' ? fieldValue : year;

    if (newYear && newMonth && newDay) {
      const daysInMonth = getDaysInMonth(newYear, newMonth);
      const validDay = Math.min(Number(newDay), daysInMonth);
      onChange(`${newYear}-${newMonth}-${pad(validDay)}`);
    } else {
      onChange(`${newYear}-${newMonth}-${newDay}`);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-3 gap-2">
          <AnimatedSelect
            value={day}
            onChange={(v) => handleChange('day', v)}
            options={dayOptions}
            placeholder="Día"
            disabled={disabled}
            accent={accent}
          />
          <AnimatedSelect
            value={month}
            onChange={(v) => handleChange('month', v)}
            options={MESES}
            placeholder="Mes"
            disabled={disabled}
            accent={accent}
          />
          <AnimatedSelect
            value={year}
            onChange={(v) => handleChange('year', v)}
            options={yearOptions}
            placeholder="Año"
            disabled={disabled}
            accent={accent}
          />
        </div>
        <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
      </div>

      {required && !value && (
        <input type="hidden" required value={value} onChange={() => {}} />
      )}
    </div>
  );
}
