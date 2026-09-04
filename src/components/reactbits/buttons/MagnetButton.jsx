import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import './MagnetButton.css'

/**
 * MagnetButton component from React Bits
 * Button that softly pulls towards the cursor on hover
 */
export default function MagnetButton({
  children,
  className = '',
  magnetStrength = 0.35,
  onClick,
  ...props
}) {
  const ref = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    if (!ref.current) return
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)
    setPosition({ x: middleX * magnetStrength, y: middleY * magnetStrength })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, mass: 0.1 }}
      className={`magnet-button ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
