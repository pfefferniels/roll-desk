interface BoundaryProps {
    begin: number;
    end: number;
    pitch: number;
    pixelsPerTick: number;
    noteHeight: number;
}

export const Boundary = ({ begin, end, pitch, pixelsPerTick, noteHeight }: BoundaryProps) => {
    const bracketLength = 2.5; // Length of the horizontal lines for brackets

    return (
        <>
            <g className='startBoundary'>
                <line // Vertical line for the beginning
                    x1={begin * pixelsPerTick}
                    y1={(128 - pitch) * noteHeight}
                    x2={begin * pixelsPerTick}
                    y2={(128 - pitch) * noteHeight + noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />

                <line // Top horizontal line for the beginning bracket
                    x1={begin * pixelsPerTick}
                    y1={(128 - pitch) * noteHeight}
                    x2={begin * pixelsPerTick + bracketLength}
                    y2={(128 - pitch) * noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />

                <line // Bottom horizontal line for the beginning bracket
                    x1={begin * pixelsPerTick}
                    y1={(128 - pitch) * noteHeight + noteHeight}
                    x2={begin * pixelsPerTick + bracketLength}
                    y2={(128 - pitch) * noteHeight + noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />
            </g>

            <g className='endBoundary'>
                <line // Vertical line for the end
                    x1={end * pixelsPerTick}
                    y1={(128 - pitch) * noteHeight}
                    x2={end * pixelsPerTick}
                    y2={(128 - pitch) * noteHeight + noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />

                <line // Top horizontal line for the ending bracket
                    x1={end * pixelsPerTick}
                    y1={(128 - pitch) * noteHeight}
                    x2={end * pixelsPerTick - bracketLength}
                    y2={(128 - pitch) * noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />

                <line // Bottom horizontal line for the ending bracket
                    x1={end * pixelsPerTick}
                    y1={(128 - pitch) * noteHeight + noteHeight}
                    x2={end * pixelsPerTick - bracketLength}
                    y2={(128 - pitch) * noteHeight + noteHeight}
                    stroke='black'
                    strokeWidth={1}
                />
            </g>
        </>
    );
};
