import { RefObject, useCallback, useEffect, useState } from "react"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { Shift, Stretch } from "linked-rolls"

interface FixedCursorProps {
    fixedAt: number
    shift?: Shift
    stretch?: Stretch
}

export const FixedCursor = ({ fixedAt, shift, stretch }: FixedCursorProps) => {
    const { translateX } = usePinchZoom()

    const shiftedText = (shift && stretch) && `| ${((fixedAt * stretch.factor + shift.horizontal) / 10).toFixed(2)}cm`

    const cursorText = `
        ${(fixedAt / 10).toFixed(2)}cm ${shiftedText || ''}`;

    const translatedX = translateX(fixedAt)

    return (
        <>
            <line
                x1={translatedX}
                y1={0}
                x2={translatedX}
                y2={4000}
                strokeWidth={1}
                stroke='black'
                strokeDasharray={4}
                className='cursor' />

            <text
                x={translatedX}
                y={10}
                fontSize={12}
                textAnchor='middle'
                fill='black'
                className='cursor'
            >
                {cursorText}
            </text>

        </>
    )
}

interface CursorProps {
    svgRef: RefObject<SVGElement>
    onFix: (x: number) => void
    shift?: Shift
    stretch?: Stretch
}

export const Cursor = ({ svgRef, onFix, shift, stretch }: CursorProps) => {
    const { translateX, zoom } = usePinchZoom()
    const [cursorX, setCursorX] = useState(0)

    const shiftedText = (shift && stretch) && `| ${((cursorX * stretch.factor + shift.horizontal) / 10).toFixed(2)}cm`
    const cursorText = `${(cursorX / 10).toFixed(2)}cm ${shiftedText || ''}`;
    const translatedX = translateX(cursorX)

    const onMouseMove = useCallback((event: MouseEvent) => {
        if (!event.target) return

        const rect = (event.target as Element).getBoundingClientRect();
        const x = event.clientX - rect.left;
        setCursorX(x / zoom)
    }, [zoom])

    useEffect(() => {
        const svg = svgRef.current
        if (!svg) return

        svg.addEventListener('mousemove', onMouseMove)

        return () => {
            svg.removeEventListener('mousemove', onMouseMove)
        }
    }, [onMouseMove, svgRef])

    return (
        <>
            <line
                onClick={() => onFix(cursorX)}
                x1={translatedX}
                y1={0}
                x2={translatedX}
                y2={4000}
                strokeWidth={0.5}
                stroke='black'
                className='cursor'
            />

            <text
                x={translatedX}
                y={10}
                fontSize={12}
                textAnchor='middle'
                fill='black'
                className='cursor'
            >
                {cursorText}
            </text>
        </>
    )
}
