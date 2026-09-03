import { Expression, Note } from "linked-rolls";
import { useCallback, useContext, useMemo, useState } from "react";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { EditionContext } from "../../providers/EditionContext";

interface PerforationProps {
    symbol: Note | Expression;
    age?: number;
    highlight: boolean;
    onClick: () => void;
}

export const Perforation = ({ symbol, age, highlight, onClick }: PerforationProps) => {
    const { view, viewOnly } = useContext(EditionContext)
    const [displayDetails, setDisplayDetails] = useState(false);
    const { translateX, trackToY, laneHeight, height: canvasHeight, zoom } = usePinchZoom();

    /** Playback announces the symbol it has reached on the group itself. */
    const followPlayback = useCallback((node: SVGGElement | null) => {
        if (!node) return

        const show = () => setDisplayDetails(true)
        node.addEventListener('playback-event', show)
        return () => node.removeEventListener('playback-event', show)
    }, [])

    const features = useMemo(() => view?.carriersOf(symbol) ?? [], [view, symbol]);

    const { onsets, offsets } = useMemo(() => ({
        onsets: features.map(e => e.horizontal.from).sort(),
        offsets: features.map(e => e.horizontal.to).sort()
    }), [features]);

    const dimensions = view?.dimensionOf(symbol)

    if (!view || !dimensions) return null;
    if (onsets.length === 0 || offsets.length === 0) return null;

    const innerBoundaries = [onsets[onsets.length - 1], offsets[0]].map(translateX);
    const onsetStretch = [onsets[0], onsets[onsets.length - 1]].map(translateX);
    const offsetStretch = [offsets[0], offsets[offsets.length - 1]].map(translateX);

    const meanOnset = dimensions.horizontal.from
    const meanOffset = dimensions.horizontal.to

    const y = trackToY(features[0].vertical.from);
    const height = laneHeight(features[0].vertical.from);

    const opacity = 1 / ((age || 0) + 1)
    const color = (age || 0) >= 1 ? 'gray' : 'black';

    if (zoom < 0.7) {
        return (
            <g
                ref={followPlayback}
                data-id={symbol.id}
                id={symbol.id}
                className='collated-event'
                style={{
                    pointerEvents: viewOnly ? 'none' : 'auto'
                }}
                onMouseEnter={() => setDisplayDetails(true)}
                onMouseLeave={() => setDisplayDetails(false)}
            >
                <rect
                    x={innerBoundaries[0]}
                    width={innerBoundaries[1] - innerBoundaries[0]}
                    y={y}
                    height={height}
                    fill={highlight ? 'red' : color}
                    fillOpacity={opacity}
                    onClick={onClick} />
                {zoom >= 0.3 && (
                    <>
                        <line
                            x1={translateX(meanOnset)}
                            x2={translateX(meanOnset)}
                            y1={displayDetails ? 0 : y - 10}
                            y2={displayDetails ? canvasHeight : y + 20}
                            stroke='black'
                            strokeWidth={0.2}
                            strokeOpacity={0.7} />
                        <line
                            x1={translateX(meanOffset)}
                            x2={translateX(meanOffset)}
                            y1={displayDetails ? 0 : y - 10}
                            y2={displayDetails ? canvasHeight : y + 20}
                            stroke='black'
                            strokeWidth={0.2}
                            strokeOpacity={0.7} />
                    </>
                )}
            </g>

        )
    }

    return (
        <g
            ref={followPlayback}
            data-id={symbol.id}
            id={symbol.id}
            className='collated-event'
            onMouseEnter={() => setDisplayDetails(true)}
            onMouseLeave={() => setDisplayDetails(false)}
        >
            <rect
                x={innerBoundaries[0]}
                width={innerBoundaries[1] - innerBoundaries[0]}
                y={y}
                height={height}
                fill={highlight ? 'red' : color}
                fillOpacity={opacity}
                onClick={onClick} />
            <line
                x1={translateX(meanOnset)}
                x2={translateX(meanOnset)}
                y1={displayDetails ? 0 : y - 10}
                y2={displayDetails ? canvasHeight : y + 20}
                stroke='black'
                strokeWidth={0.2}
                strokeOpacity={0.7} />
            <line
                x1={translateX(meanOffset)}
                x2={translateX(meanOffset)}
                y1={displayDetails ? 0 : y - 10}
                y2={displayDetails ? canvasHeight : y + 20}
                stroke='black'
                strokeWidth={0.2}
                strokeOpacity={0.7} />

            <polygon
                onClick={onClick}
                fill={color}
                fillOpacity={opacity}
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
    const { view } = useContext(EditionContext)
    const { translateX, bandOf } = usePinchZoom()

    if (!view) return null

    const onsets = view.carriersOf(on).map(e => e.horizontal.from).sort()
    const offsets = view.carriersOf(off).map(e => e.horizontal.to).sort()

    if (onsets.length === 0 || offsets.length === 0) return null

    const innerBoundaries = [onsets[0], offsets[0]].map(translateX)
    const { y, height } = bandOf({ from: 12, to: 88 })

    return (
        <rect
            className='pedal'
            x={innerBoundaries[0]}
            width={innerBoundaries[1] - innerBoundaries[0]}
            y={y}
            height={height}
            fill='gray'
            fillOpacity={0.1}
            stroke='black'
            strokeWidth={0.4}
        />
    )
}
