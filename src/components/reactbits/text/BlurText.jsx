import React from 'react'
import { motion } from 'framer-motion'
import './BlurText.css'

/**
 * BlurText component from React Bits
 * Text transitions from blurry to sharp with a staggered cascade
 */
export default function BlurText({
  text = '',
  delay = 80,
  className = '',
  animateBy = 'words', // 'words' | 'letters'
  direction = 'top', // 'top' | 'bottom'
}) {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('')

  const fromSnapshot = {
    filter: 'blur(10px)',
    opacity: 0,
    transform: direction === 'top' ? 'translateY(-30px)' : 'translateY(30px)',
  }

  const toSnapshot = {
    filter: 'blur(0px)',
    opacity: 1,
    transform: 'translateY(0px)',
  }

  return (
    <span className={`blur-text-wrapper ${className}`}>
      {elements.map((word, index) => (
        <motion.span
          key={index}
          initial={fromSnapshot}
          animate={toSnapshot}
          transition={{
            duration: 0.6,
            delay: (index * delay) / 1000,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="blur-text-element"
        >
          {word}
          {animateBy === 'words' && index < elements.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  )
}
