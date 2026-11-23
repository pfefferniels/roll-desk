/** A colour as the screen shows it, each channel from 0 to 255. */
export interface Rgb {
    r: number
    g: number
    b: number
}

/** A colour in OKLab, whose distances follow how far apart colours look. */
interface Lab {
    L: number
    a: number
    b: number
}

export const white: Rgb = { r: 255, g: 255, b: 255 }
export const black: Rgb = { r: 0, g: 0, b: 0 }

export const rgbOf = (hex: string): Rgb => {
    const value = parseInt(hex.replace('#', ''), 16)
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

export const hexOf = ({ r, g, b }: Rgb): string =>
    `#${[r, g, b].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`

const linear = (channel: number) => {
    const v = channel / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

const encoded = (v: number) =>
    255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

/** After Björn Ottosson, "A perceptual color space for image processing" (2020). */
export const oklabOf = (colour: Rgb): Lab => {
    const r = linear(colour.r), g = linear(colour.g), b = linear(colour.b)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return {
        L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    }
}

/** The colour on screen, or nothing where the screen cannot show it. */
const screenColourOf = ({ L, a, b }: Lab): Rgb | undefined => {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    const linearRgb = [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ]
    if (linearRgb.some(v => v < -1e-4 || v > 1 + 1e-4)) return undefined

    const [r = 0, g = 0, blue = 0] = linearRgb.map(v => Math.round(encoded(Math.min(1, Math.max(0, v)))))
    return { r, g, b: blue }
}

/** How far apart two colours look: their distance in OKLab. */
export const apart = (one: Rgb, other: Rgb): number => {
    const x = oklabOf(one), y = oklabOf(other)
    return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b)
}

/**
 * The colours the desk gives a meaning of its own on a copy, which a
 * later hand's colour must not be taken for: the dark grey the punched
 * features are drawn in, the purple of a selection, the blue of the
 * cursor and the focus.
 */
export const spokenFor: readonly Rgb[] = ['#444444', '#7d26cd', '#1976d2'].map(rgbOf)

/**
 * The colours to choose from: at every tenth degree of hue and every
 * step of lightness from fairly dark to nearly white, each as vivid as
 * the screen can show it, up to a limit past which colours glare.
 */
const candidates: readonly Rgb[] = (() => {
    const found: Rgb[] = []
    for (let L = 0.4; L <= 0.901; L += 0.05) {
        for (let hue = 0; hue < 360; hue += 10) {
            const angle = hue * Math.PI / 180
            for (let chroma = 0.2; chroma >= 0.04; chroma -= 0.01) {
                const colour = screenColourOf({ L, a: chroma * Math.cos(angle), b: chroma * Math.sin(angle) })
                if (colour) {
                    found.push(colour)
                    break
                }
            }
        }
    }
    return found
})()

/** The contrast WCAG asks of graphics against what is next to them (1.4.11). */
const graphicContrast = 3

const chosen = new Map<string, Rgb>()

/**
 * The colour that stands furthest apart from the ground it is drawn on
 * and from every colour the desk already speaks with: of all candidates,
 * the one whose nearest neighbour among them is furthest off. On the
 * brown of a red Welte roll that is a light blue, on white a strong
 * colour of middling lightness.
 */
export const contrastingColour = (ground: Rgb, avoid: readonly Rgb[] = spokenFor): Rgb => {
    const key = [ground, ...avoid].map(hexOf).join()
    const known = chosen.get(key)
    if (known) return known

    const nearest = (candidate: Rgb) =>
        Math.min(apart(candidate, ground), ...avoid.map(other => apart(candidate, other)))

    // What a line or a hole needs to be made out on its ground, as WCAG
    // asks of graphics; on a ground no candidate reaches it, all count.
    const legible = candidates.filter(candidate => contrastRatio(candidate, ground) >= graphicContrast)
    const best = (legible.length ? legible : candidates)
        .reduce((best, candidate) => nearest(candidate) > nearest(best) ? candidate : best)
    chosen.set(key, best)
    return best
}

const luminance = ({ r, g, b }: Rgb) =>
    0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)

/** The WCAG contrast ratio of two colours, from 1 to 21. */
export const contrastRatio = (one: Rgb, other: Rgb): number => {
    const [light, dark] = [luminance(one), luminance(other)].sort((x, y) => y - x)
    return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}

/** Black or white, whichever reads better on the colour: for text on it, or an edge round it. */
export const inkOn = (colour: Rgb): Rgb =>
    contrastRatio(colour, black) >= contrastRatio(colour, white) ? black : white

/** The paper as it shows through the scan's opacity, over the white of the page. */
export const showingThrough = (paper: Rgb, opacity: number): Rgb => ({
    r: paper.r * opacity + 255 * (1 - opacity),
    g: paper.g * opacity + 255 * (1 - opacity),
    b: paper.b * opacity + 255 * (1 - opacity)
})

/**
 * The colour of the paper among the pixels of a scan, as RGBA bytes:
 * the mean of the middle half of them by brightness, so that the holes,
 * which show the light or the dark behind the paper, and the specks of
 * dirt are left out.
 */
export const paperAmong = (pixels: ArrayLike<number>): Rgb | undefined => {
    const colours: Rgb[] = []
    for (let i = 0; i + 3 < pixels.length; i += 4) {
        colours.push({ r: pixels[i] ?? 0, g: pixels[i + 1] ?? 0, b: pixels[i + 2] ?? 0 })
    }
    if (!colours.length) return undefined

    const middle = colours
        .sort((one, other) => luminance(one) - luminance(other))
        .slice(Math.floor(colours.length / 4), Math.ceil(colours.length * 3 / 4))

    const mean = (channel: keyof Rgb) => middle.reduce((sum, colour) => sum + colour[channel], 0) / middle.length
    return { r: mean('r'), g: mean('g'), b: mean('b') }
}

/** Black or white, whichever lies nearer the ground, which an edge in it seems to belong to. */
export const nearerOf = (ground: Rgb): Rgb =>
    contrastRatio(ground, black) <= contrastRatio(ground, white) ? black : white

/**
 * The colours a later hand is drawn in on a ground: its own; the edge
 * set round its lines and letters, which is of the ground's side, dark
 * on a dark paper and light on a light one, so that it parts them from
 * whatever lies under them without weighing on the drawing; and the ink
 * of text set on it.
 */
export interface Hand {
    colour: string
    halo: string
    ink: string
}

export const handOn = (ground: Rgb): Hand => {
    const colour = contrastingColour(ground)
    return { colour: hexOf(colour), halo: hexOf(nearerOf(ground)), ink: hexOf(inkOn(colour)) }
}
