'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface CardFlipProps {
  isFlipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}

export function CardFlip({
  isFlipped,
  front,
  back,
  className = '',
}: CardFlipProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{isFlipped ? back : front}</div>;
  }

  return (
    <div
      style={{ perspective: 1000 }}
      className={`relative w-full h-full ${className}`}
    >
      <motion.div
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          type: 'spring',
          stiffness: 240,
          damping: 24,
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className="w-full h-full relative"
      >
        {/* Front Face */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className="w-full h-full absolute inset-0"
        >
          {front}
        </div>

        {/* Back Face */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className="w-full h-full absolute inset-0"
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}
