/**
 * Scrolls the shape drawn for an entity into view and flashes it, the
 * way playback marks the symbol being played. False when nothing is
 * drawn for the id yet.
 */
export const spotlight = (id: string, milliseconds: number): boolean => {
    const group = document.getElementById(id)
    if (!group) return false
    const shape = group.querySelector('rect') ?? group

    shape.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })

    const original = {
        fill: shape.getAttribute('fill') ?? window.getComputedStyle(shape).fill ?? '',
        stroke: shape.getAttribute('stroke') ?? '',
        strokeWidth: shape.getAttribute('stroke-width') ?? ''
    }
    shape.setAttribute('fill', 'orange')
    shape.setAttribute('stroke', 'orangered')
    shape.setAttribute('stroke-width', '1.5')

    const restore = (name: string, value: string) =>
        value ? shape.setAttribute(name, value) : shape.removeAttribute(name)
    window.setTimeout(() => {
        restore('fill', original.fill)
        restore('stroke', original.stroke)
        restore('stroke-width', original.strokeWidth)
    }, milliseconds)

    return true
}

/**
 * Spotlights an entity as soon as the view has drawn it, giving up
 * after a few seconds. Returns a function that cancels the wait.
 */
export const spotlightWhenDrawn = (id: string, onDone: () => void, frames = 240): () => void => {
    let remaining = frames
    let handle = 0
    const attempt = () => {
        if (spotlight(id, 1500) || remaining-- <= 0) {
            onDone()
            return
        }
        handle = window.requestAnimationFrame(attempt)
    }
    handle = window.requestAnimationFrame(attempt)
    return () => window.cancelAnimationFrame(handle)
}
