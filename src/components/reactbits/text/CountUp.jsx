import React, { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'

/**
 * CountUp component from React Bits
 * Smoothly counts up numbers when scrolled into view or value changes
 */
export default function CountUp({
  to = 0,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = ',',
  prefix = '',
  suffix = '',
  decimals = 0,
}) {
  const ref = useRef(null)
  const motionValue = useMotionValue(direction === 'down' ? to : from)

  const damping = 20 + 40 * (1 / duration)
  const stiffness = 100 * (1 / duration)

  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
  })

  const isInView = useInView(ref, { once: true, margin: '0px' })

  useEffect(() => {
    if (isInView && startWhen) {
      const timer = setTimeout(() => {
        motionValue.set(direction === 'down' ? from : to)
      }, delay * 1000)

      return () => clearTimeout(timer)
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay])

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        const formatted = Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
          .format(latest)
          .replace(/,/g, separator)

        ref.current.textContent = `${prefix}${formatted}${suffix}`
      }
    })

    return () => unsubscribe()
  }, [springValue, decimals, separator, prefix, suffix])

  return <span ref={ref} className={className}>{prefix}{from}{suffix}</span>
}
