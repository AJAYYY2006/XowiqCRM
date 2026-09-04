import React from 'react'
import './AuroraBackground.css'

/**
 * AuroraBackground component from React Bits
 * Flowing northern-lights aurora gradient background
 */
export default function AuroraBackground({
  children,
  className = '',
  showRadialGradient = true,
  ...props
}) {
  return (
    <div className={`aurora-container ${className}`} {...props}>
      <div className="aurora-layers">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
        {showRadialGradient && <div className="aurora-radial-mask" />}
      </div>
      <div className="aurora-content">{children}</div>
    </div>
  )
}
