/**
 * Error Dialog component
 * Displays user-friendly error messages with optional recovery actions
 */

import { useEffect, useRef } from 'react';
import { Button } from './Button';

interface ErrorDialogProps {
  title?: string;
  message: string;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

export function ErrorDialog({
  title = 'Something went wrong',
  message,
  onClose,
  onAction,
  actionLabel = 'Help',
}: ErrorDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Move focus into the dialog so keyboard users land on a control
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="space-y-2 p-5">
          <h3
            id="error-dialog-title"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            {title}
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-gray-200 p-3 dark:border-gray-800">
          <Button ref={closeRef} variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          {onAction && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onAction();
                onClose();
              }}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
