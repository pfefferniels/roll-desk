import { dimensionOf, Expression, HandwrittenText, Note, RollLabel, Stamp } from "linked-rolls/lib/Symbol";
import { useState } from "react";
import { usePinchZoom } from "../../hooks/usePinchZoom";

interface PerforationProps {
    symbol: Note | Expression;
    highlight: boolean;
    onClick: () => void;
}

export const Perforation = ({ symbol, highlight, onClick }: PerforationProps) => {
    const [displayDetails, setDisplayDetails] = useState(false);
    const { translateX, trackToY, trackHeight } = usePinchZoom();

    const features = symbol.isCarriedBy;
    if (!features) return null;

    const onsets = features.map(e => e.horizontal.from).sort();
    const offsets = features.map(e => e.horizontal.to).sort();

    if (onsets.length === 0 || offsets.length === 0) return null;

    const innerBoundaries = [onsets[onsets.length - 1], offsets[0]].map(translateX);
    const onsetStretch = [onsets[0], onsets[onsets.length - 1]].map(translateX);
    const offsetStretch = [offsets[0], offsets[offsets.length - 1]].map(translateX);

    const dimensions = dimensionOf(symbol)
    const meanOnset = dimensions.horizontal.from
    const meanOffset = dimensions.horizontal.to

    const y = trackToY(features[0].vertical.from);
    const height = symbol.type === 'note' ? trackHeight.note : trackHeight.expression;

    return (
        <g
            data-id={symbol.id}
            id={symbol.id}
            className='collated-event'
        >
            <rect
                x={innerBoundaries[0]}
                width={innerBoundaries[1] - innerBoundaries[0]}
                y={y}
                height={height}
                fill={highlight ? 'red' : 'black'}
                fillOpacity={0.4}
                onClick={onClick} />
            <line
                x1={meanOnset}
                x2={meanOnset}
                y1={displayDetails ? trackToY(100) : y - 10}
                y2={displayDetails ? trackToY(0) : y + 20}
                stroke='black'
                strokeWidth={0.2}
                strokeOpacity={0.7} />
            <line
                x1={meanOffset}
                x2={meanOffset}
                y1={displayDetails ? trackToY(100) : y - 10}
                y2={displayDetails ? trackToY(0) : y + 20}
                stroke='black'
                strokeWidth={0.2}
                strokeOpacity={0.7} />

            <polygon
                onClick={onClick}
                onMouseEnter={() => setDisplayDetails(true)}
                onMouseLeave={() => setDisplayDetails(false)}
                fill='red'
                fillOpacity={0.15}
                points={`
                        ${onsetStretch[0]},${y + height / 2}
                        ${innerBoundaries[0]},${y}
                        ${innerBoundaries[1]},${y}
                        ${offsetStretch[1]},${y + height / 2}
                        ${innerBoundaries[1]},${y + height}
                        ${innerBoundaries[0]},${y + height}
                    `} />
            {displayDetails && (
                <text
                    x={innerBoundaries[0]}
                    y={y - 2}
                    fontSize={12}
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
    const { translateX, trackToY } = usePinchZoom()

    const onsets = on.isCarriedBy.map(e => e.horizontal.from).sort()
    const offsets = off.isCarriedBy.map(e => e.horizontal.to).sort()

    if (onsets.length === 0 || offsets.length === 0) return null

    const innerBoundaries = [onsets[0], offsets[0]].map(translateX)
    const y1 = trackToY(88)
    const y2 = trackToY(12)
    const height = y2 - y1

    return (
        <rect
            className='pedal'
            x={innerBoundaries[0]}
            width={innerBoundaries[1] - innerBoundaries[0]}
            y={y1}
            height={height}
            fill='gray'
            fillOpacity={0.1}
            stroke='black'
            strokeWidth={0.4}
        />
    )
}

interface TextSymbolProps {
    event: HandwrittenText | Stamp | RollLabel;
    onClick: () => void;
}

export const TextSymbol = ({
    event,
    onClick,
}: TextSymbolProps) => {
    const { translateX, trackToY } = usePinchZoom();

    const { horizontal, vertical } = dimensionOf(event);

    const x = translateX(horizontal.from)
    const y = trackToY(vertical.from);

    const width = translateX(horizontal.to - horizontal.from);
    const height = vertical.to === undefined
        ? trackToY(0) - trackToY(vertical.from)
        : trackToY(vertical.to) - trackToY(vertical.from);

    return (
        <g className="textEvent" data-id={event.id} onClick={onClick}>
            <rect
                fill="white"
                fillOpacity={0.5}
                onClick={onClick}
                strokeWidth={0}
                x={x}
                y={y}
                width={width}
                height={height}
            />
            <text
                fill="black"
                stroke="black"
                fillOpacity={0.9}
                strokeOpacity={0.9}
                transform={`translate(${x + width}, ${y + height / 2}) rotate(${event.type === "rollLabel" ? 90 : event.rotation || 90
                    })`}
                fontSize={12}
            >
                {event.text.split("\n").map((line) => (
                    <tspan
                        x={0}
                        dy="1.2em"
                        alignmentBaseline="middle"
                        textAnchor="middle"
                        key={`span_${line}`}
                    >
                        {line}
                    </tspan>
                ))}
            </text>
        </g>
    );
};
