import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export interface KanbanColumnDef<TStatus extends string = string> {
  id: TStatus;
  title: string;
  badgeBg: string;
  badgeText: string;
  borderColor?: string;
  icon?: React.ReactNode;
}

export interface KanbanBoardProps<TItem extends { id: string }, TStatus extends string = string> {
  id?: string;
  columns: KanbanColumnDef<TStatus>[];
  items: TItem[];
  getItemColumnId: (item: TItem) => TStatus;
  onItemDrop: (itemId: string, targetColumnId: TStatus) => void;
  renderCard: (item: TItem, index: number) => React.ReactNode;
  onAddClick?: (columnId: TStatus) => void;
  addLabel?: string;
  emptyMessage?: (columnTitle: string) => string;
  className?: string;
  gridColsClassName?: string;
}

export function KanbanBoard<TItem extends { id: string }, TStatus extends string = string>({
  id = 'kanban-board',
  columns,
  items,
  getItemColumnId,
  onItemDrop,
  renderCard,
  onAddClick,
  addLabel = 'Add item',
  emptyMessage,
  className = '',
  gridColsClassName,
}: KanbanBoardProps<TItem, TStatus>) {
  const [dragOverColumn, setDragOverColumn] = useState<TStatus | null>(null);

  // Default responsive grid based on column count
  const defaultGridClass =
    columns.length === 6
      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5'
      : columns.length === 4
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4';

  const gridClass = gridColsClassName || defaultGridClass;

  const handleDragOver = (e: React.DragEvent, colId: TStatus) => {
    e.preventDefault();
    setDragOverColumn(colId);
  };

  const handleDragLeave = (colId: TStatus) => {
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: TStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;
    onItemDrop(itemId, targetColumnId);
  };

  return (
    <div id={id} className={`${gridClass} items-start ${className}`}>
      {columns.map((col) => {
        const columnItems = items.filter((item) => getItemColumnId(item) === col.id);
        const isDraggingOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            id={`kanban-column-${col.id}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={() => handleDragLeave(col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col rounded-2xl border transition-all duration-150 ${
              isDraggingOver
                ? 'border-[var(--accent-blue)] bg-blue-500/5 ring-2 ring-blue-500/20'
                : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40'
            } p-3 space-y-2.5 min-h-[480px]`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5 min-w-0">
                {col.icon && <span className="shrink-0">{col.icon}</span>}
                <h3 className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {col.title}
                </h3>
                <span
                  id={`column-count-${col.id}`}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${col.badgeBg} ${col.badgeText}`}
                >
                  {columnItems.length}
                </span>
              </div>

              {onAddClick && (
                <button
                  type="button"
                  onClick={() => onAddClick(col.id)}
                  title={`Add item to ${col.title}`}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Column Cards Container */}
            <div className="flex-1 space-y-2 overflow-y-auto">
              {columnItems.length === 0 ? (
                <div
                  onClick={() => onAddClick && onAddClick(col.id)}
                  className="py-10 border border-dashed border-[var(--border-subtle)] rounded-xl flex flex-col items-center justify-center text-center p-3 hover:border-[var(--border-strong)] transition-colors cursor-pointer group"
                >
                  <span className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                    {emptyMessage ? emptyMessage(col.title) : `No items in ${col.title.toLowerCase()}`}
                  </span>
                  {onAddClick && (
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1 font-medium">
                      <Plus className="w-3 h-3" /> Click to add
                    </span>
                  )}
                </div>
              ) : (
                columnItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                    {renderCard(item, index)}
                  </React.Fragment>
                ))
              )}
            </div>

            {/* Bottom Add Button */}
            {onAddClick && (
              <button
                type="button"
                onClick={() => onAddClick(col.id)}
                className="w-full py-1 px-2 rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-dashed border-transparent hover:border-[var(--border-subtle)] transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{addLabel}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
