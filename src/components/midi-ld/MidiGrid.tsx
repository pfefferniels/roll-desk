interface MidiGridProps {
    pixelsPerTick: number; 
    noteHeight: number;
    lastTick: number;
}

export const MidiGrid = ({ pixelsPerTick, noteHeight, lastTick }: MidiGridProps) => {
    const dpi = 300.25; // Dots per inch
    const cmPerInch = 2.54; // Centimeters per inch
    const ticksPerCm = dpi / cmPerInch; // Ticks per centimeter

    // Calculate number of centimeters
    const numCm = Math.ceil(lastTick / ticksPerCm);

    // Create array of cm and notes
    const centimeters = Array.from({ length: numCm }, (_, i) => i);
    const notes = Array.from({ length: 128 }, (_, i) => i);

    return (
        <g>
            {/* Draw vertical lines for each centimeter */}
            {centimeters.map((cm) => (
                <line
                    key={cm}
                    x1={cm * ticksPerCm * pixelsPerTick}
                    y1={0}
                    x2={cm * ticksPerCm * pixelsPerTick}
                    y2={128 * noteHeight}
                    stroke="#ddd"
                    strokeWidth={0.5}
                />
            ))}

            {/* Draw horizontal lines for each note */}
            {notes.map((note) => (
                <line
                    key={note}
                    x1={0}
                    y1={note * noteHeight}
                    x2={lastTick * pixelsPerTick}
                    y2={note * noteHeight}
                    stroke="#ddd"
                    strokeWidth={0.5}
                />
            ))}
        </g>
    );
}
