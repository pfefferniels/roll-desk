import { RefObject, useCallback, useEffect, useState } from "react"
import { usePinchZoom } from "../../hooks/usePinchZoom"

interface FixedCursorProps {
    fixedAt: number 
}

export const FixedCursor = ({ fixedAt }: FixedCursorProps) => {
    const { translateX } = usePinchZoom()
    const translatedX = translateX(fixedAt)

    return (
        <line
            x1={translatedX}
            y1={0}
            x2={translatedX}
            y2={4000}
            strokeWidth={1}
            stroke='black'
            strokeDasharray={4}
            className='cursor' />
    )
}

interface CursorProps {
    svgRef: RefObject<SVGElement>
    onFix: (x: number) => void
}

export const Cursor = ({ svgRef, onFix }: CursorProps) => {
    const { translateX, zoom } = usePinchZoom()
    const [cursorX, setCursorX] = useState(0)

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
        <line
            onClick={() => onFix(cursorX)}
            x1={translatedX}
            y1={0}
            x2={translatedX}
            y2={4000}
            strokeWidth={1}
            stroke='black'
            className='cursor' />
    )
}