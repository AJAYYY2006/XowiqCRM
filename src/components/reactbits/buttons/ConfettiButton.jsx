import React from 'react'
import confetti from 'canvas-confetti'
import ShinyButton from './ShinyButton'

/**
 * ConfettiButton component from React Bits
 * Triggers a confetti burst animation on click
 */
export default function ConfettiButton({
  children,
  onClick,
  confettiOptions = {},
  variant = 'primary',
  className = '',
  ...props
}) {
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (rect.left + rect.width / 2) / window.innerWidth
    const y = (rect.top + rect.height / 2) / window.innerHeight

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x, y },
      colors: ['#6366f1', '#a855f7', '#ec4899', '#38bdf8', '#10b981', '#f59e0b'],
      ...confettiOptions,
    })

    if (onClick) {
      onClick(e)
    }
  }

  return (
    <ShinyButton
      variant={variant}
      className={`confetti-btn ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </ShinyButton>
  )
}
