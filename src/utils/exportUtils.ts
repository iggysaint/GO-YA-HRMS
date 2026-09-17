import * as XLSX from 'xlsx';

export interface ExportColumn<T = any> {
  header: string;
  key?: keyof T | string;
  accessor?: (item: T) => any;
  format?: (value: any, item: T) => string | number | boolean | null | undefined;
}

export interface ExportOptions<T = any> {
  filename: string;
  columns: ExportColumn<T>[];
  data: T[];
  sheetName?: string;
}

/**
 * Format any value for clean, consistent export
 */
export function formatExportValue<T>(
  col: ExportColumn<T>,
  item: T
): string | number | boolean {
  let raw: any;
  if (col.accessor) {
    raw = col.accessor(item);
  } else if (col.key && typeof col.key === 'string' && col.key in (item as any)) {
    raw = (item as any)[col.key];
  } else {
    raw = '';
  }

  if (col.format) {
    const formatted = col.format(raw, item);
    return formatted ?? '';
  }

  if (raw === null || raw === undefined) {
    return '';
  }

  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return raw;
  }

  if (raw instanceof Date) {
    return raw.toISOString().split('T')[0];
  }

  if (typeof raw === 'string') {
    // Check if ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
      const datePart = raw.split('T')[0];
      return datePart;
    }
    return raw;
  }

  if (Array.isArray(raw)) {
    return raw.join(', ');
  }

  if (typeof raw === 'object') {
    return JSON.stringify(raw);
  }

  return String(raw);
}

/**
 * Trigger a browser file download using a Blob
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Shared CSV Export
 */
export function exportToCSV<T>(options: ExportOptions<T>): void {
  const { filename, columns, data } = options;

  // Build header row
  const headerRow = columns.map((col) => {
    const text = col.header.replace(/"/g, '""');
    return `"${text}"`;
  }).join(',');

  // Build data rows
  const dataRows = data.map((item) => {
    return columns.map((col) => {
      const val = formatExportValue(col, item);
      const strVal = String(val ?? '').replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel correctly recognizes UTF-8 encoded characters
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const finalFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;

  triggerFileDownload(blob, finalFilename);
}

/**
 * Shared Excel (.xlsx) Export
 */
export function exportToExcel<T>(options: ExportOptions<T>): void {
  const { filename, columns, data, sheetName = 'Data' } = options;

  // Transform data rows with human-readable column headers
  const transformedRows = data.map((item) => {
    const rowObj: Record<string, any> = {};
    columns.forEach((col) => {
      rowObj[col.header] = formatExportValue(col, item);
    });
    return rowObj;
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(transformedRows);

  // Auto-calculate column widths based on maximum content length
  const colWidths = columns.map((col) => {
    let maxLength = col.header.length;
    data.forEach((item) => {
      const val = formatExportValue(col, item);
      const len = String(val ?? '').length;
      if (len > maxLength) {
        maxLength = len;
      }
    });
    return { wch: Math.min(Math.max(maxLength + 3, 12), 45) };
  });

  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  const finalFilename = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalFilename);
}

/**
 * Main export handler supporting both CSV and Excel (.xlsx)
 */
export function exportDataset<T>(
  format: 'csv' | 'xlsx',
  options: ExportOptions<T>
): void {
  if (format === 'xlsx') {
    exportToExcel(options);
  } else {
    exportToCSV(options);
  }
}
