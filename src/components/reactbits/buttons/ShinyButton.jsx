import React from 'react'
import { motion } from 'framer-motion'
import './ShinyButton.css'

/**
 * ShinyButton component from React Bits
 * Button with an iridescent metallic gradient sweep and interactive hover effects
 */
export default function ShinyButton({
  children,
  className = '',
  onClick,
  disabled = false,
  variant = 'primary', // 'primary' | 'secondary' | 'accent'
  ...props
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`shiny-btn-root ${variant} ${className}`}
      {...props}
    >
      <span className="shiny-btn-glow" />
      <span className="shiny-btn-shimmer" />
      <span className="shiny-btn-text">{children}</span>
    </motion.button>
  )
}
