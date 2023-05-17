interface BoundaryProps {
    begin: number;
    end: number;
    pitch: number;
    pixelsPerTick: number;
    noteHeight: number;
}

export const Boundary = ({ begin, end, pitch, pixelsPerTick, noteHeight }: BoundaryProps) => (
    <>
        <line // Dotted line for the beginning
            x1={begin * pixelsPerTick}
            y1={(128 - pitch) * noteHeight}
            x2={begin * pixelsPerTick}
            y2={(128 - pitch) * noteHeight + noteHeight}
            stroke='black'
            strokeWidth={1}
            strokeDasharray={1}
        />

        <line // Dotted line for the end
            x1={end * pixelsPerTick}
            y1={(128 - pitch) * noteHeight}
            x2={end * pixelsPerTick}
            y2={(128 - pitch) * noteHeight + noteHeight}
            stroke='black'
            strokeWidth={1}
            strokeDasharray={1}
        />
    </>
);
