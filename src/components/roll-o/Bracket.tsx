import { useEffect, useRef } from "react"
import { useNoteContext } from "../../providers/NoteContext"
import * as d3 from "d3"

interface BracketProps {
    direction: 'open' | 'close' | 'straight'
    position: number
    onChange: (newPos: number) => void
    onEnd: (newPos: number) => void
    pitch: number
}

export const Bracket = ({ direction, position, pitch, onChange, onEnd }: BracketProps) => {
    const { pixelsPerTick, noteHeight } = useNoteContext()

    const bracketLength = 2.5; // Length of the horizontal lines for brackets
    const ref = useRef<SVGGElement | null>(null);

    useEffect(() => {
        ref.current && d3.select(ref.current)
            .call(
                (d3.drag()
                    .on("drag", (event: any) => onChange(event.x / pixelsPerTick))
                    .on("end", (event: any) => onEnd(event.x / pixelsPerTick))) as any
            );
    }, [pixelsPerTick, onChange, onEnd]);

    if (direction === 'straight') {
        return (
            <g className='boundary' ref={ref} transform={`translate(${position * pixelsPerTick},0)`}>
                <line // Vertical line for the beginning
                    x1={0}
                    y1={(128 - pitch) * noteHeight}
                    x2={0}
                    y2={(128 - pitch) * noteHeight + noteHeight}
                    stroke='black'
                    strokeLinecap='round'
                    strokeWidth={1}
                />
            </g>
        )
    }

    return (
        <g className='boundary' ref={ref} transform={`translate(${position * pixelsPerTick},0)`}>
            <line // Vertical line for the beginning
                x1={0}
                y1={(128 - pitch) * noteHeight}
                x2={0}
                y2={(128 - pitch) * noteHeight + noteHeight}
                stroke='black'
                strokeLinecap='round'
                strokeWidth={1}
            />
            <line // Top horizontal line
                x1={0}
                y1={(128 - pitch) * noteHeight}
                x2={direction === 'open' ? bracketLength : -bracketLength}
                y2={(128 - pitch) * noteHeight}
                stroke='black'
                strokeLinecap='round'
                strokeWidth={1}
            />
            <line // Bottom horizontal line
                x1={0}
                y1={(128 - pitch) * noteHeight + noteHeight}
                x2={direction === 'open' ? bracketLength : -bracketLength}
                y2={(128 - pitch) * noteHeight + noteHeight}
                stroke='black'
                strokeLinecap='round'
                strokeWidth={1}
            />
        </g>

    )
}
