import React from 'react'
import './GlowBorderCard.css'

/**
 * GlowBorderCard component from React Bits
 * Features an animated rotating rainbow/gradient glow border
 */
export default function GlowBorderCard({
  children,
  className = '',
  glowColor = 'conic-gradient(from 0deg, #6366f1, #a855f7, #ec4899, #3b82f6, #6366f1)',
  borderWidth = 2,
  borderRadius = '1rem',
  speed = 4,
  style = {},
  onClick,
}) {
  return (
    <div
      className={`glow-border-card-wrapper ${className}`}
      onClick={onClick}
      style={{
        '--border-radius': borderRadius,
        '--border-width': `${borderWidth}px`,
        '--speed': `${speed}s`,
        '--glow-bg': glowColor,
        ...style,
      }}
    >
      <div className="glow-border-effect" />
      <div className="glow-border-inner">{children}</div>
    </div>
  )
}
