import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption<T> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  bulletColor?: string; // Tailwind class, e.g., 'bg-rose-500'
}

interface CustomDropdownProps<T> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  className?: string;
  align?: 'left' | 'right';
  id?: string;
  disabled?: boolean;
}

export default function CustomDropdown<T>({
  value,
  onChange,
  options,
  className = '',
  align = 'left',
  id,
  disabled = false,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${isOpen ? 'z-30' : 'z-10'} ${className}`} id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl transition-colors text-[11px] font-medium focus:outline-none ${
          disabled
            ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
            : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {selectedOption?.bulletColor && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.bulletColor}`} />
          )}
          {selectedOption?.icon && (
            <span className="shrink-0 flex items-center justify-center text-xs leading-none">{selectedOption.icon}</span>
          )}
          <span className="truncate leading-none">{selectedOption?.label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 mt-1.5 min-w-full w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 p-1.5 rounded-xl shadow-xl dark:shadow-2xl dark:backdrop-blur-xl ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <div className="space-y-0.5 max-h-[240px] overflow-y-auto custom-scrollbar">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {option.bulletColor && (
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${option.bulletColor} border border-black/15 dark:border-white/10`} />
                      )}
                      {option.icon && (
                        <span className="shrink-0 flex items-center justify-center text-xs leading-none">{option.icon}</span>
                      )}
                      <span className="truncate leading-normal">{option.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
