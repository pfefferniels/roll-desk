import { RefObject, useCallback, useEffect, useState } from "react"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { useSelection } from "../../providers/SelectionContext"

interface CursorProps {
    svgRef: RefObject<SVGGElement | null>
}

export const Cursor = ({ svgRef }: CursorProps) => {
    const { translateX, zoom } = usePinchZoom()
    const [cursorX, setCursorX] = useState(0)

    const cursorText = `${(cursorX / 10).toFixed(2)} cm`;
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
                textAnchor='left'
                fill='black'
                className='cursor'
            >
                {cursorText}
            </text>
        </>
    )
}
