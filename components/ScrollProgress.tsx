'use client';

import { motion, useReducedMotion, useScroll } from 'framer-motion';

interface ScrollProgressProps {
  color?: string;
  height?: number;
}

export function ScrollProgress({
  color = '#4a8d7a',
  height = 3,
}: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return null;

  return (
    <motion.div
      className="scroll-progress-indicator fixed top-0 left-0 right-0 z-50 origin-left pointer-events-none"
      style={{ scaleX: scrollYProgress, height, background: color, willChange: 'transform' }}
    />
  );
}
