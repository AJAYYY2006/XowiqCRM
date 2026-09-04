import React from 'react'
import './DotBackground.css'

/**
 * DotBackground component from React Bits
 * Techy matrix / subtle dot grid overlay
 */
export default function DotBackground({
  children,
  className = '',
  dotColor = 'rgba(255, 255, 255, 0.08)',
  dotSize = 1.5,
  gap = 24,
  mask = true,
  style = {},
}) {
  return (
    <div
      className={`dot-background-wrapper ${className}`}
      style={{
        '--dot-color': dotColor,
        '--dot-size': `${dotSize}px`,
        '--dot-gap': `${gap}px`,
        ...style,
      }}
    >
      <div className={`dot-pattern-layer ${mask ? 'has-mask' : ''}`} />
      <div className="dot-background-content">{children}</div>
    </div>
  )
}
