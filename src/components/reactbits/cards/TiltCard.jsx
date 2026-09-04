import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import './TiltCard.css'

/**
 * TiltCard component from React Bits
 * 3D interactive tilt effect responding to cursor motion
 */
export default function TiltCard({
  children,
  className = '',
  maxTilt = 15,
  scale = 1.02,
  speed = 400,
  glare = true,
  onClick,
  style = {},
}) {
  const ref = useRef(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 })

  const handleMouseMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rX = ((y - centerY) / centerY) * -maxTilt
    const rY = ((x - centerX) / centerX) * maxTilt

    setRotateX(rX)
    setRotateY(rY)

    if (glare) {
      setGlarePos({
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100,
        opacity: 0.25,
      })
    }
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
    setGlarePos((prev) => ({ ...prev, opacity: 0 }))
  }

  return (
    <motion.div
      ref={ref}
      className={`tilt-card-container ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{
        rotateX,
        rotateY,
        scale: rotateX !== 0 || rotateY !== 0 ? scale : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: speed,
        damping: 25,
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
        ...style,
      }}
    >
      <div className="tilt-card-content">{children}</div>
      {glare && (
        <div
          className="tilt-card-glare"
          style={{
            opacity: glarePos.opacity,
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.4), transparent 60%)`,
          }}
        />
      )}
    </motion.div>
  )
}
