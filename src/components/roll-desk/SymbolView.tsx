import { dimensionOf, Expression, HandwrittenText, Note, RollLabel, Stamp } from "linked-rolls/lib/Symbol";
import { useState } from "react";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { flat } from "linked-rolls";
import { validateAndFixCoordinates } from "../../helpers/notationAlignment";

interface PerforationProps {
    symbol: Note | Expression;
    age?: number;
    highlight: boolean;
    onClick: () => void;
}

export const Perforation = ({ symbol, age, highlight, onClick }: PerforationProps) => {
    const [displayDetails, setDisplayDetails] = useState(false);
    const { translateX, trackToY, trackHeight } = usePinchZoom();

    const features = flat(symbol.carriers);
    if (!features || features.length === 0) return null;

    // Improved validation and sorting for complex notation
    const onsets = features
        .map(e => e.horizontal?.from)
        .filter(v => v !== undefined && isFinite(v))
        .sort((a, b) => a - b);
    const offsets = features
        .map(e => e.horizontal?.to)
        .filter(v => v !== undefined && isFinite(v))
        .sort((a, b) => a - b);

    if (onsets.length === 0 || offsets.length === 0) return null;

    // More robust boundary calculations for beam alignment
    const innerBoundaryStart = Math.max(...onsets);
    const innerBoundaryEnd = Math.min(...offsets);
    
    // Validate that boundaries make sense
    if (innerBoundaryStart > innerBoundaryEnd) {
        console.warn('Invalid note boundaries detected for symbol:', symbol.id);
        return null;
    }

    const innerBoundaries = [innerBoundaryStart, innerBoundaryEnd].map(translateX);
    const onsetStretch = [Math.min(...onsets), Math.max(...onsets)].map(translateX);
    const offsetStretch = [Math.min(...offsets), Math.max(...offsets)].map(translateX);

    const dimensions = dimensionOf(symbol);
    if (!dimensions?.horizontal) {
        console.warn('Missing dimensions for symbol:', symbol.id);
        return null;
    }
    
    const meanOnset = dimensions.horizontal.from;
    const meanOffset = dimensions.horizontal.to;

    // Improved y-position calculation with validation
    const verticalPos = features[0].vertical?.from;
    if (verticalPos === undefined || !isFinite(verticalPos)) {
        console.warn('Invalid vertical position for symbol:', symbol.id);
        return null;
    }
    
    const y = trackToY(verticalPos);
    const height = symbol.type === 'note' ? trackHeight.note : trackHeight.expression;

    // Ensure minimum height for visibility
    const safeHeight = Math.max(height, 1);

    const opacity = Math.max(0.1, 1 / ((age || 0) + 1)); // Ensure minimum opacity
    const color = (age || 0) >= 1 ? 'gray' : 'black';

    // Validate coordinates before rendering
    const coordValidation = validateAndFixCoordinates({
        x: innerBoundaries[0],
        y: y,
        width: innerBoundaries[1] - innerBoundaries[0],
        height: safeHeight
    });

    if (coordValidation.hasIssues) {
        console.warn('Coordinate issues detected and fixed for symbol:', symbol.id);
    }

    return (
        <g
            data-id={symbol.id}
            id={symbol.id}
            className='collated-event'
            onMouseEnter={() => setDisplayDetails(true)}
            onMouseLeave={() => setDisplayDetails(false)}
        >
            <rect
                x={coordValidation.x}
                width={coordValidation.width}
                y={coordValidation.y}
                height={coordValidation.height}
                fill={highlight ? 'red' : color}
                fillOpacity={opacity}
                onClick={onClick} />
            
            {/* Improved stem lines with better positioning for complex notation */}
            <line
                x1={translateX(meanOnset)}
                x2={translateX(meanOnset)}
                y1={displayDetails ? trackToY(100) : coordValidation.y - 10}
                y2={displayDetails ? trackToY(0) : coordValidation.y + coordValidation.height + 10}
                stroke='black'
                strokeWidth={0.2}
                strokeOpacity={0.7}
                className="note-stem-start" />
            <line
                x1={translateX(meanOffset)}
                x2={translateX(meanOffset)}
                y1={displayDetails ? trackToY(100) : coordValidation.y - 10}
                y2={displayDetails ? trackToY(0) : coordValidation.y + coordValidation.height + 10}
                stroke='black'
                strokeWidth={0.2}
                strokeOpacity={0.7}
                className="note-stem-end" />

            {/* Improved polygon for beam representation */}
            <polygon
                onClick={onClick}
                fill={color}
                fillOpacity={opacity}
                points={`
                        ${onsetStretch[0]},${coordValidation.y + coordValidation.height / 2}
                        ${coordValidation.x},${coordValidation.y}
                        ${coordValidation.x + coordValidation.width},${coordValidation.y}
                        ${offsetStretch[1]},${coordValidation.y + coordValidation.height / 2}
                        ${coordValidation.x + coordValidation.width},${coordValidation.y + coordValidation.height}
                        ${coordValidation.x},${coordValidation.y + coordValidation.height}
                    `}
                className="note-beam" />
            
            {displayDetails && (
                <text
                    x={Math.max(0, coordValidation.x)}
                    y={Math.max(12, coordValidation.y - 2)}
                    fontSize={12}
                    className="note-details"
                >
                    <tspan>
                        {symbol.type === 'expression' && symbol.expressionType}
                        {symbol.type === 'note' && `Note: ${symbol.pitch}`}
                    </tspan>
                </text>
            )}
        </g>
    );
};

interface SustainPedalProps {
    on: Expression
    off: Expression
}

export const SustainPedal = ({ on, off }: SustainPedalProps) => {
    const { translateX, trackToY } = usePinchZoom();

    // Improved validation for sustain pedal carriers
    const onCarriers = flat(on.carriers);
    const offCarriers = flat(off.carriers);
    
    if (!onCarriers || !offCarriers) {
        console.warn('Missing carriers for sustain pedal:', on.id, off.id);
        return null;
    }

    const onsets = onCarriers
        .map(e => e.horizontal?.from)
        .filter(v => v !== undefined && isFinite(v))
        .sort((a, b) => a - b);
    const offsets = offCarriers
        .map(e => e.horizontal?.to)
        .filter(v => v !== undefined && isFinite(v))
        .sort((a, b) => a - b);

    if (onsets.length === 0 || offsets.length === 0) {
        console.warn('No valid coordinates for sustain pedal:', on.id, off.id);
        return null;
    }

    const startX = Math.min(...onsets);
    const endX = Math.max(...offsets);
    
    if (startX >= endX) {
        console.warn('Invalid sustain pedal range:', startX, endX);
        return null;
    }

    const innerBoundaries = [startX, endX].map(translateX);
    const y1 = trackToY(88);
    const y2 = trackToY(12);
    const height = Math.abs(y2 - y1);

    // Validate coordinates before rendering
    const coordValidation = validateAndFixCoordinates({
        x: innerBoundaries[0],
        y: Math.min(y1, y2),
        width: innerBoundaries[1] - innerBoundaries[0],
        height: height
    });

    if (coordValidation.hasIssues) {
        console.warn('Coordinate issues detected for sustain pedal:', on.id, off.id);
    }

    return (
        <rect
            className='pedal'
            x={coordValidation.x}
            width={coordValidation.width}
            y={coordValidation.y}
            height={coordValidation.height}
            fill='gray'
            fillOpacity={0.1}
            stroke='black'
            strokeWidth={0.4}
        />
    );
};

interface TextSymbolProps {
    event: HandwrittenText | Stamp | RollLabel;
    onClick: () => void;
}

export const TextSymbol = ({
    event,
    onClick,
}: TextSymbolProps) => {
    const { translateX, trackToY } = usePinchZoom();

    const dimensions = dimensionOf(event);
    if (!dimensions?.horizontal || !dimensions?.vertical) {
        console.warn('Missing dimensions for text symbol:', event.id);
        return null;
    }

    const { horizontal, vertical } = dimensions;

    const x = translateX(horizontal.from);
    const y = trackToY(vertical.from);

    const calculatedWidth = translateX(horizontal.to - horizontal.from);
    const calculatedHeight = vertical.to === undefined
        ? trackToY(0) - trackToY(vertical.from)
        : trackToY(vertical.to) - trackToY(vertical.from);

    // Validate and fix coordinates
    const coordValidation = validateAndFixCoordinates({
        x: x,
        y: y,
        width: calculatedWidth,
        height: Math.abs(calculatedHeight)
    });

    if (coordValidation.hasIssues) {
        console.warn('Coordinate issues detected for text symbol:', event.id);
    }

    // Determine rotation with fallback
    const rotation = event.type === "rollLabel" ? 90 : (event.rotation || 90);
    
    // Validate rotation value
    const safeRotation = isFinite(rotation) ? rotation : 90;

    // Calculate transform with safety checks
    const transformX = coordValidation.x + coordValidation.width;
    const transformY = coordValidation.y + coordValidation.height / 2;
    
    if (!isFinite(transformX) || !isFinite(transformY)) {
        console.warn('Invalid transform coordinates for text symbol:', event.id);
        return null;
    }

    return (
        <g className="textEvent" data-id={event.id} onClick={onClick}>
            <rect
                fill="white"
                fillOpacity={0.5}
                onClick={onClick}
                strokeWidth={0}
                x={coordValidation.x}
                y={coordValidation.y}
                width={coordValidation.width}
                height={coordValidation.height}
            />
            <text
                fill="black"
                stroke="black"
                fillOpacity={0.9}
                strokeOpacity={0.9}
                transform={`translate(${transformX}, ${transformY}) rotate(${safeRotation})`}
                fontSize={12}
                className="text-symbol-content"
            >
                {event.text?.split("\n").map((line, index) => (
                    <tspan
                        x={0}
                        dy="1.2em"
                        alignmentBaseline="middle"
                        textAnchor="middle"
                        key={`span_${event.id}_${index}_${line}`}
                    >
                        {line}
                    </tspan>
                )) || []}
            </text>
        </g>
    );
};
