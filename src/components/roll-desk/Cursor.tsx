import { RefObject, useCallback, useEffect, useState } from "react"
import { usePinchZoom } from "../../hooks/usePinchZoom"

interface CursorProps {
    svgRef: RefObject<SVGElement>
}

export const Cursor = ({ svgRef }: CursorProps) => {
    const { translateX, zoom } = usePinchZoom()
    const [cursorX, setCursorX] = useState(0)
    const [fixedX, setFixedX] = useState<number>()

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
            {fixedX && (
                <line
                    x1={translateX(fixedX)}
                    y1={100}
                    x2={translateX(cursorX)}
                    y2={100}
                    strokeWidth={5}
                    stroke='gray'
                />
            )}
            <line
                onClick={() => {
                    if (fixedX === undefined) {
                        setFixedX(cursorX)
                    }
                    else {
                        setFixedX(undefined)
                    }
                }}
                x1={translatedX}
                y1={0}
                x2={translatedX}
                y2={4000}
                strokeWidth={2}
                stroke='black'
                className='cursor'
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
