import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Bordered surface shared by every top-level section of the workspace.
 * Sections are flat by design: nested regions use dividers, not more borders.
 */
const Panel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
        className
      )}
      {...props}
    />
  )
);

Panel.displayName = 'Panel';

export { Panel };
