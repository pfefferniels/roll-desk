import { useCallback, useState } from "react"
import { Box } from "../geometry/drawing"
import { Extent, fittingScale } from "./writingFit"

/** The size a writing is set in before it is scaled to its box. */
const fontSize = 8

/** What is left free round a writing inside its box. */
const inset = 1

interface WrittenTextProps {
    /** The box the writing was measured in on the roll. */
    box: Box
    /** Its lines, as they were transcribed. */
    lines: readonly string[]
    /** How far it is turned on the drawing, clockwise, in degrees. */
    angle: number
    color: string
    /** An edge round the letters, so that they read on a ground of any colour. */
    halo?: string
    id?: string
}

/**
 * A writing's lines, turned as they stand on the paper and scaled the same
 * both ways until they fill the box the writing was measured in, centred
 * in it. The text is measured once it is in the document, unturned, which
 * is what tells how far it can be scaled.
 *
 * The turn sits on a group round the text rather than on the text itself:
 * the stage gives every text a transform of its own while a zoom gesture
 * runs (see App.css), which would take the place of the turn. A writing is
 * on the paper and stretches with it during the gesture, as the scan does.
 */
export const WrittenText = ({ box, lines, angle, color, halo, id }: WrittenTextProps) => {
    const [measured, setMeasured] = useState<Extent>()

    // The text is keyed by what it says, so a new text is a new element and measured afresh.
    const measure = useCallback((element: SVGTextElement | null) => {
        if (!element) return
        const { x, y, width, height } = element.getBBox()
        setMeasured({ x, y, width, height })
    }, [])

    const room = {
        width: Math.max(0, box.width - 2 * inset),
        height: Math.max(0, box.height - 2 * inset)
    }
    const scale = measured ? fittingScale(measured, room, angle) : 1
    const middle = measured
        ? { x: measured.x + measured.width / 2, y: measured.y + measured.height / 2 }
        : { x: 0, y: 0 }

    return (
        <g
            transform={`translate(${box.x + box.width / 2} ${box.y + box.height / 2}) rotate(${angle}) scale(${scale}) translate(${-middle.x} ${-middle.y})`}
            visibility={measured ? undefined : 'hidden'}
            pointerEvents='none'
        >
            <text
                key={lines.join('\n')}
                ref={measure}
                className='onPaper'
                id={id}
                x={0}
                y={0}
                fontSize={fontSize}
                fill={color}
                {...(halo && { stroke: halo, strokeWidth: fontSize * 0.22, strokeLinejoin: 'round' as const, paintOrder: 'stroke' })}
                textAnchor='middle'
                // The edge grows and shrinks with the letters, which the stage's non-scaling strokes would not let it.
                style={{ userSelect: 'none', vectorEffect: 'none' }}
            >
                {lines.map((line, i) => (
                    <tspan key={i} x={0} dy={i === 0 ? 0 : '1.25em'}>
                        {line}
                    </tspan>
                ))}
            </text>
        </g>
    )
}
