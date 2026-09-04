import React from 'react'
import { motion } from 'framer-motion'
import './SplitText.css'

/**
 * SplitText component from React Bits
 * Animates text character by character or word by word
 */
export default function SplitText({
  text = '',
  className = '',
  delay = 50,
  duration = 0.5,
  splitBy = 'characters', // 'characters' | 'words'
  animation = { opacity: [0, 1], y: [20, 0] },
  easing = 'easeOut',
  onLetterAnimationComplete,
}) {
  const elements = splitBy === 'words' ? text.split(' ') : text.split('')

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: {
        staggerChildren: delay / 1000,
        delayChildren: 0.1 * i,
      },
    }),
  }

  const childVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: 'blur(4px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: easing,
      },
    },
  }

  return (
    <motion.span
      className={`split-text-container ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      aria-label={text}
    >
      {elements.map((el, index) => (
        <motion.span
          key={index}
          className="split-text-item"
          variants={childVariants}
          onAnimationComplete={
            index === elements.length - 1 ? onLetterAnimationComplete : undefined
          }
        >
          {el === ' ' ? '\u00A0' : el}
          {splitBy === 'words' && index < elements.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </motion.span>
  )
}
