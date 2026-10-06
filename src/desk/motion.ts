/**
 * Whether the reader has asked their system for less motion, which
 * some need to keep from getting dizzy. The view then jumps to where it
 * is taken instead of gliding there.
 */
export const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/** How the view scrolls to something it is taken to: smoothly, unless the reader asked for less motion. */
export const scrollBehavior = (): ScrollBehavior =>
    prefersReducedMotion() ? 'auto' : 'smooth'
