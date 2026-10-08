'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface GameDrawerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'right' | 'left' | 'bottom';
  className?: string;
}

export function GameDrawerSheet({
  isOpen,
  onClose,
  title,
  icon,
  description,
  children,
  footer,
  side = 'right',
  className = '',
}: GameDrawerSheetProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const slideVariants = {
    right: {
      hidden: { x: '100%', opacity: 0 },
      visible: { x: 0, opacity: 1 },
      exit: { x: '100%', opacity: 0 },
    },
    left: {
      hidden: { x: '-100%', opacity: 0 },
      visible: { x: 0, opacity: 1 },
      exit: { x: '-100%', opacity: 0 },
    },
    bottom: {
      hidden: { y: '100%', opacity: 0 },
      visible: { y: 0, opacity: 1 },
      exit: { y: '100%', opacity: 0 },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Sheet */}
          <motion.aside
            variants={slideVariants[side]}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={`fixed z-50 bg-[#111215] border-[#222429] text-[#f4f4f5] flex flex-col shadow-2xl ${
              side === 'right'
                ? 'top-0 right-0 bottom-0 w-full sm:w-96 border-l'
                : side === 'left'
                ? 'top-0 left-0 bottom-0 w-full sm:w-96 border-r'
                : 'left-0 right-0 bottom-0 max-h-[85vh] rounded-t-3xl border-t'
            } ${className}`}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#222429] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {icon && (
                  <div className="text-zinc-400">
                    {icon}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm text-white tracking-tight">{title}</h3>
                  {description && (
                    <p className="text-[11px] text-zinc-500 mt-0.5">{description}</p>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="btn-tactile p-2 rounded-lg bg-[#18191e] hover:bg-[#202228] text-zinc-400 hover:text-white border border-[#272930] transition"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {children}
            </div>

            {/* Optional Footer */}
            {footer && (
              <div className="p-4 border-t border-slate-800/80 bg-black/40">
                {footer}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
