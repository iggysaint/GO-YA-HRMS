import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'normal' | 'lg';
  id?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
}

/**
 * Shared Card Component
 * Conforms strictly to the Go-Ya design system:
 * - 8-12px corner radius (rounded-xl = 12px)
 * - Consistent border-subtle and background surface
 * - Consistent internal padding (default p-4)
 * - Subtle border-strong hover state for interactive cards
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className = '',
      interactive = false,
      padding = 'normal',
      id,
      onClick,
      draggable,
      onDragStart,
      ...rest
    },
    ref
  ) => {
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      normal: 'p-4',
      lg: 'p-5',
    }[padding];

    const isInteractive = interactive || Boolean(onClick);

    return (
      <div
        ref={ref}
        id={id}
        draggable={draggable}
        onDragStart={onDragStart}
        onClick={onClick}
        className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] ${paddingClasses} ${
          isInteractive
            ? 'hover:border-[var(--border-strong)] transition-all cursor-pointer select-none'
            : ''
        } ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
