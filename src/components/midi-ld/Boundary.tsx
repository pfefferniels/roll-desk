import * as d3 from 'd3'
import { useEffect, useRef, useState } from 'react';

interface BoundaryProps {
    begin: number;
    end: number;
    pitch: number;
    pixelsPerTick: number;
    noteHeight: number;
}

export const Boundary = ({ begin, end, pitch, pixelsPerTick, noteHeight }: BoundaryProps) => {
    const bracketLength = 2.5; // Length of the horizontal lines for brackets

    const refStartBoundary = useRef<SVGGElement | null>(null);
    const refEndBoundary = useRef<SVGGElement | null>(null);

    const [startPos, setStartPos] = useState(begin * pixelsPerTick);
    const [endPos, setEndPos] = useState(end * pixelsPerTick);

    useEffect(() => {
        refStartBoundary.current && d3.select(refStartBoundary.current)
            .call(
                (d3.drag()
                    .on("drag", (event: any) => setStartPos(event.x))
                    .on("end", dragend)) as any
            );

        refEndBoundary.current && d3.select(refEndBoundary.current)
            .call(
                (d3.drag()
                    .on("drag", (event: any) => setEndPos(event.x))
                    .on("end", dragend)) as any
            );
    }, []);

    const dragend = (event: any) => {
    };

    return (
        <>
            <g className='startBoundary' ref={refStartBoundary} transform={`translate(${startPos},0)`}>
                <line // Vertical line for the beginning
                    x1={0}
                    y1={(128 - pitch) * noteHeight}
                    x2={0}
                    y2={(128 - pitch) * noteHeight + noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />

                <line // Top horizontal line for the beginning bracket
                    x1={0}
                    y1={(128 - pitch) * noteHeight}
                    x2={bracketLength}
                    y2={(128 - pitch) * noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />

                <line // Bottom horizontal line for the beginning bracket
                    x1={0}
                    y1={(128 - pitch) * noteHeight + noteHeight}
                    x2={bracketLength}
                    y2={(128 - pitch) * noteHeight + noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />
            </g>

            <g className='endBoundary' ref={refEndBoundary} transform={`translate(${endPos},0)`}>
                <line // Vertical line for the end
                    x1={0}
                    y1={(128 - pitch) * noteHeight}
                    x2={0}
                    y2={(128 - pitch) * noteHeight + noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />

                <line // Top horizontal line for the ending bracket
                    x1={0}
                    y1={(128 - pitch) * noteHeight}
                    x2={-bracketLength}
                    y2={(128 - pitch) * noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />

                <line // Bottom horizontal line for the ending bracket
                    x1={0}
                    y1={(128 - pitch) * noteHeight + noteHeight}
                    x2={-bracketLength}
                    y2={(128 - pitch) * noteHeight + noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />
            </g>
        </>
    );
};