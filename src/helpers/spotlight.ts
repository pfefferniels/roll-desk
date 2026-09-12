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

const shapes = 'rect, path, polygon, line, text, image, circle, ellipse'

/** The shape a spotlight paints: what carries the id, or the first shape where that is a group. */
const shapeOf = (carrier: Element) => carrier.querySelector(shapes) ?? carrier

/** An id beginning with a digit is no CSS identifier, so it is asked for as an attribute value. */
const quoted = (id: string) => `"${id.replace(/["\\]/g, '\\$&')}"`

/**
 * Every shape drawn for an entity. One entity may be drawn in more than
 * one place: an edit within its motivation as well as on the roll, and a
 * motivation as a hull around each group of edits it holds together.
 */
const shapesOf = (id: string) => [...new Set(
    [...document.querySelectorAll(`[id=${quoted(id)}], [data-id=${quoted(id)}]`)].map(shapeOf)
)]

/**
 * Scrolls what is drawn for an entity into view and flashes it, the way
 * playback marks the symbol being played. False when nothing is drawn
 * for the id yet.
 */
export const spotlight = (id: string, milliseconds: number): boolean => {
    const drawn = shapesOf(id)
    const [first] = drawn
    if (!first) return false

    first.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    drawn.forEach(shape => flash(shape, milliseconds))

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
