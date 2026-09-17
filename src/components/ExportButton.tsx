import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Check,
} from 'lucide-react';
import { ExportColumn, exportDataset } from '../utils/exportUtils';

export interface ExportButtonProps<T = any> {
  id?: string;
  filename: string;
  columns: ExportColumn<T>[];
  data: T[];
  sheetName?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
  variant?: 'outline' | 'subtle' | 'primary';
  size?: 'sm' | 'md';
  onExportSuccess?: (format: 'xlsx' | 'csv', count: number) => void;
}

export const ExportButton = <T extends any>({
  id = 'export-dropdown-btn',
  filename,
  columns,
  data,
  sheetName,
  label = 'Export',
  disabled = false,
  className = '',
  align = 'right',
  variant = 'outline',
  size = 'md',
  onExportSuccess,
}: ExportButtonProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [justExported, setJustExported] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (disabled || data.length === 0) return;

    exportDataset(format, {
      filename,
      columns,
      data,
      sheetName,
    });

    setJustExported(format);
    setTimeout(() => setJustExported(null), 2500);
    setIsOpen(false);

    if (onExportSuccess) {
      onExportSuccess(format, data.length);
    }
  };

  // Base style variants matching existing Notion-inspired buttons
  const baseSizeStyles =
    size === 'sm'
      ? 'px-2.5 py-1 text-xs gap-1.5'
      : 'px-3.5 py-1.5 text-xs font-medium gap-2';

  let variantStyles =
    'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] shadow-2xs';
  if (variant === 'primary') {
    variantStyles =
      'bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 shadow-xs';
  } else if (variant === 'subtle') {
    variantStyles =
      'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]';
  }

  const isDataEmpty = data.length === 0;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-lg transition-all flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${baseSizeStyles} ${variantStyles} ${className}`}
        title={`Export ${data.length} records`}
      >
        {justExported ? (
          <Check className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in" />
        ) : (
          <Download className="w-3.5 h-3.5 opacity-80" />
        )}
        <span>{justExported ? 'Exported!' : label}</span>
        <ChevronDown
          className={`w-3 h-3 opacity-60 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-56 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-lg py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header Info */}
          <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Export current view</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {data.length} {data.length === 1 ? 'row' : 'rows'}
            </span>
          </div>

          <div className="p-1 space-y-0.5">
            {/* Excel (.xlsx) Option */}
            <button
              id={`${id}-option-xlsx`}
              type="button"
              disabled={isDataEmpty}
              onClick={() => handleExport('xlsx')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-xs leading-tight">Excel Spreadsheet</p>
                  <p className="text-[10px] text-[var(--text-muted)]">.xlsx formatted workbook</p>
                </div>
              </div>
            </button>

            {/* CSV Option */}
            <button
              id={`${id}-option-csv`}
              type="button"
              disabled={isDataEmpty}
              onClick={() => handleExport('csv')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-xs leading-tight">CSV Document</p>
                  <p className="text-[10px] text-[var(--text-muted)]">.csv delimited table</p>
                </div>
              </div>
            </button>
          </div>

          {isDataEmpty && (
            <div className="px-3 py-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border-t border-[var(--border-subtle)]">
              No matching records to export based on current filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
