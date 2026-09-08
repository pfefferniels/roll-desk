/** The attributes a spotlight paints over. An attribute the shape does not carry reads ''. */
type Paint = {
    fill: string
    stroke: string
    'stroke-width': string
}

/** A spotlight under way: what the shape wore before it, and the timer that puts that back. */
type Lit = {
    before: Paint
    timer: ReturnType<typeof setTimeout>
}

const spotlightPaint: Paint = {
    fill: 'orange',
    stroke: 'orangered',
    'stroke-width': '1.5'
}

const lit = new WeakMap<Element, Lit>()

const paintOf = (shape: Element): Paint => ({
    fill: shape.getAttribute('fill') ?? window.getComputedStyle(shape).fill ?? '',
    stroke: shape.getAttribute('stroke') ?? '',
    'stroke-width': shape.getAttribute('stroke-width') ?? ''
})

const repaint = (shape: Element, paint: Paint) =>
    Object.entries(paint).forEach(([name, value]) =>
        value ? shape.setAttribute(name, value) : shape.removeAttribute(name))

/**
 * Paints the spotlight colours over a shape and puts back what it wore
 * once the time has passed. A shape already lit keeps the reading taken
 * when its first spotlight began, so a second one cannot record the
 * spotlight's own colours as the shape's.
 */
const flash = (shape: Element, milliseconds: number) => {
    const running = lit.get(shape)
    if (running) clearTimeout(running.timer)

    const before = running?.before ?? paintOf(shape)
    repaint(shape, spotlightPaint)
    lit.set(shape, {
        before,
        timer: setTimeout(() => {
            lit.delete(shape)
            repaint(shape, before)
        }, milliseconds)
    })
}

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
    flash(shape, milliseconds)

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
