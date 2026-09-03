import { RefObject, useCallback, useEffect, useState } from "react"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { rollXAt } from "../../helpers/pointer"

interface CursorProps {
    svgRef: RefObject<SVGGElement | null>
}

export const Cursor = ({ svgRef }: CursorProps) => {
    const { translateX, zoom } = usePinchZoom()
    const [cursorX, setCursorX] = useState(0)

    const cursorText = `${(cursorX / 10).toFixed(2)} cm`;
    const translatedX = translateX(cursorX)

    const onMouseMove = useCallback((event: MouseEvent) => {
        const ground = svgRef.current
        if (!ground) return

        const x = rollXAt(ground, event.clientX, zoom)
        if (x !== undefined) setCursorX(x)
    }, [svgRef, zoom])

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
                x1={translatedX}
                y1={0}
                x2={translatedX}
                y2={4000}
                strokeWidth={2}
                stroke='black'
                className='cursor'
                pointerEvents='none'
            />

            <text
                x={translatedX}
                y={10}
                fontSize={12}
                textAnchor='start'
                fill='black'
                className='cursor'
            >
                {cursorText}
            </text>
        </>
    )
}
