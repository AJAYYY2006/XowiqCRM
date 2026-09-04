import React from 'react'
import './ShinyText.css'

/**
 * ShinyText component from React Bits
 * Creates a sweeping iridescent light shimmer across text
 */
export default function ShinyText({
  text = '',
  disabled = false,
  speed = 5,
  className = '',
}) {
  const animationDuration = `${speed}s`

  return (
    <span
      className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`}
      style={{ animationDuration }}
    >
      {text}
    </span>
  )
}
