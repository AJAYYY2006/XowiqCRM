import React, { useEffect, useState, useRef } from 'react'
import './DecryptedText.css'

/**
 * DecryptedText component from React Bits
 * Cyberpunk / sci-fi decryption scramble animation
 */
export default function DecryptedText({
  text = '',
  speed = 50,
  maxIterations = 10,
  sequential = true,
  revealDirection = 'start', // 'start' | 'end' | 'center'
  useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
  className = '',
  animateOn = 'hover', // 'hover' | 'view'
}) {
  const [displayText, setDisplayText] = useState(text)
  const [isHovering, setIsHovering] = useState(false)
  const [isScrambling, setIsScrambling] = useState(false)
  const intervalRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    let iteration = 0
    const originalText = text
    const chars = characters.split('')

    if ((animateOn === 'view' || isHovering) && !isScrambling) {
      setIsScrambling(true)
      clearInterval(intervalRef.current)

      intervalRef.current = setInterval(() => {
        setDisplayText(() => {
          return originalText
            .split('')
            .map((char, index) => {
              if (char === ' ') return ' '
              if (sequential) {
                if (index < iteration) return originalText[index]
              } else {
                if (iteration >= maxIterations) return originalText[index]
              }

              if (useOriginalCharsOnly) {
                return originalText[Math.floor(Math.random() * originalText.length)]
              }
              return chars[Math.floor(Math.random() * chars.length)]
            })
            .join('')
        })

        iteration += 1
        if (iteration > (sequential ? originalText.length + 3 : maxIterations)) {
          clearInterval(intervalRef.current)
          setDisplayText(originalText)
          setIsScrambling(false)
        }
      }, speed)
    }

    return () => clearInterval(intervalRef.current)
  }, [isHovering, text, animateOn, speed, sequential, maxIterations, characters, useOriginalCharsOnly])

  return (
    <span
      ref={containerRef}
      className={`decrypted-text ${className}`}
      onMouseEnter={() => animateOn === 'hover' && setIsHovering(true)}
      onMouseLeave={() => animateOn === 'hover' && setIsHovering(false)}
    >
      {displayText}
    </span>
  )
}
