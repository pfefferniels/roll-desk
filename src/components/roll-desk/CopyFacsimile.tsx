import {
    AnyFeature,
    GluedOn,
    Path,
    RollCopy,
    Writing,
} from "linked-rolls";
import { defaultWelteT100Options } from "linked-rolls/welte-t100";
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx";
import { boxOf } from "../../helpers/rollGeometry.ts";
import { useContext, useLayoutEffect, useRef, useState } from "react";
import { RollGrid } from "./RollGrid.tsx";
import { Cursor } from "./Cursor.tsx";
import { EventDimension } from "./RollDesk.tsx";
import { Arguable } from "./Arguable.tsx";
import { EditionContext } from "../../providers/EditionContext.tsx";
import { ModificationView } from "./ModificationView.tsx";
import { Facsimile } from "./Facsimile.tsx";

interface CopyFacsimileProps {
    copy: RollCopy;
    active: boolean;
    onClick: (e: AnyFeature) => void;
    onChange: (copy: RollCopy) => void;
    color: string;
    onSelectionDone: (dimension: EventDimension) => void;
    facsimileOpacity: number;
}

export const CopyFacsimile = ({
    copy,
    active,
    color,
    onClick,
    onSelectionDone,
    facsimileOpacity,
}: CopyFacsimileProps) => {
    const { edition, apply } = useContext(EditionContext);
    const geometry = usePinchZoom();
    const svgRef = useRef<SVGGElement>(null);

    if (!edition) return null

    return (
        <>
            <g className="roll-copy" ref={svgRef}>
                <defs>
                    <filter id="contrast-brightness">
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.5" intercept="0.1" />
                            <feFuncG type="linear" slope="1.5" intercept="0.1" />
                            <feFuncB type="linear" slope="1.5" intercept="0.1" />
                        </feComponentTransfer>
                    </filter>
                    <filter id="contrast">
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.5" intercept="-0.25" />
                            <feFuncG type="linear" slope="1.5" intercept="-0.25" />
                            <feFuncB type="linear" slope="1.5" intercept="-0.25" />
                        </feComponentTransfer>
                    </filter>
                    <filter id="invert">
                        <feComponentTransfer>
                            <feFuncR type="table" tableValues="1 0" />
                            <feFuncG type="table" tableValues="1 0" />
                            <feFuncB type="table" tableValues="1 0" />
                        </feComponentTransfer>
                    </filter>
                </defs>

                <Facsimile copy={copy} opacity={facsimileOpacity} />

                <Cursor svgRef={svgRef} />

                {active && (
                    <RollGrid
                        selectionMode={active}
                        onSelectionDone={onSelectionDone}
                        width={geometry.translateX(geometry.rollLength)}
                    />
                )}

                {copy.features.map((feature, featureIndex) => {
                    return (
                        <Feature
                            key={feature.id}
                            feature={feature}
                            conditionPath={['copies', edition.copies.indexOf(copy), 'features', featureIndex, 'condition']}
                            onClick={() => onClick(feature)}
                            color={color}
                            onChange={() => {
                                apply(draft => {
                                    const editionCopy = draft.copies.find(c => c.id === copy.id)
                                    if (!editionCopy) return

                                    const index = editionCopy.features.findIndex(f => f.id === feature.id)
                                    if (index === -1) return

                                    editionCopy.features[index] = feature
                                })
                            }}
                        />
                    )
                })}

                {copy.modifications.map((modification, i) => {
                    return (
                        <ModificationView
                            key={`modification_${i}`}
                            modification={modification}
                        />
                    )
                })}
            </g>

            <KeyboardDivision division={defaultWelteT100Options.division} />
        </>
    );
};

const KeyboardDivision = ({ division }: { division: number }) => {
    const { trackToY, translateX, rollLength } = usePinchZoom();

    const y = trackToY(division);

    return (
        <line
            x1={0}
            y1={y}
            x2={translateX(rollLength)}
            y2={y}
            stroke="black"
            strokeWidth={1}
            strokeDasharray={"5 5"}
        />
    );
};

interface FeatureProps<FeatureType extends AnyFeature = AnyFeature> {
    feature: FeatureType;
    conditionPath?: Path
    onClick: React.MouseEventHandler;
    onChange?: (feature: FeatureType) => void;
    color: string;
}

const Feature = ({ feature, conditionPath, onClick, color }: FeatureProps) => {
    const { x, y } = boxOf(feature, usePinchZoom());

    return (
        <g className="feature">
            {(feature.type === 'GluedOn') && <GluedOnFeature feature={feature} color={color} onClick={onClick} />}
            {feature.type === 'Writing' && <WritingFeature feature={feature} color={color} onClick={onClick} />}
            {(feature.type === 'Hole') && <HoleFeature feature={feature} color={color} onClick={onClick} />}
            {(feature.type === 'Mark') && <MarkFeature feature={feature} color={color} onClick={onClick} />}

            {(feature.condition && conditionPath) && (
                <foreignObject
                    x={x + 10}
                    y={y - 10}
                    width={200}
                    height={40}
                    fontSize={10}
                    transform={`rotate(-90 ${x} ${y})`}
                >
                    <Arguable
                        path={conditionPath}
                    >
                        {feature.condition.type.replaceAll('-', ' ')}
                    </Arguable>
                </foreignObject>
            )}
        </g>
    );
}

const GluedOnFeature = ({ feature, color }: FeatureProps<GluedOn>) => {
    const { x, y, width, height } = boxOf(feature, usePinchZoom());

    return (
        <>
            <rect
                fill={color}
                fillOpacity={0.2}
                strokeWidth={0}
                x={x}
                y={y}
                width={width}
                height={height}
                data-id={feature.id}
                id={feature.id}
                filter="url(#spray)"
            />

            {feature.features?.map((subFeature, index) => {
                if (subFeature.type !== "Writing") return null;

                const text = (subFeature as Writing).transcription.text;
                const chunks = text.split("\n");

                const cx = x + width;
                const cy = y + height / 2;

                return (
                    <ScaledRotatedText
                        key={`subfeature_${index}`}
                        cx={cx}
                        cy={cy}
                        boxWidth={width}
                        boxHeight={height}
                        color={color}
                        chunks={chunks}
                    />
                );
            })}
        </>
    );
};

function ScaledRotatedText({
    cx,
    cy,
    boxWidth,
    boxHeight,
    color,
    chunks,
}: {
    cx: number;
    cy: number;
    boxWidth: number;
    boxHeight: number;
    color: string;
    chunks: string[];
}) {
    const textRef = useRef<SVGTextElement | null>(null);
    const [scale, setScale] = useState(1);

    const fontSize = 8;
    const lineHeight = 12;

    // padding so it doesn't touch edges
    const pad = 4;
    const availW = Math.max(0, boxWidth - pad * 2);
    const availH = Math.max(0, boxHeight - pad * 2);

    useLayoutEffect(() => {
        const el = textRef.current;
        if (!el) return;

        // Important: bbox is in the element's current user space.
        // Measure BEFORE we apply our scale (or reset scale to 1 before measuring).
        const bbox = el.getBBox();
        const w = bbox.width || 1;
        const h = bbox.height || 1;

        // Uniform scale to fit
        const s = Math.min(availW / w, availH / h);

        // clamp so it doesn't get absurdly tiny/huge (tweak to taste)
        const clamped = Math.max(0.3, Math.min(6, s));

        setScale(clamped);
    }, [chunks.join("\n"), availW, availH]);

    // Apply scale around the same rotation center.
    // Order matters: rotate around (cx,cy), then scale around (cx,cy).
    const transform = `rotate(90 ${cx} ${cy}) translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;

    return (
        <text
            ref={textRef}
            transform={transform}
            x={cx}
            y={cy}
            fontSize={fontSize}
            fill={color}
            textAnchor="middle"
            dominantBaseline="hanging" // keep your current baseline choice
            style={{ userSelect: "none" }}
        >
            {chunks.map((chunk, i) => (
                <tspan key={i} x={cx} dy={i === 0 ? 0 : lineHeight}>
                    {chunk}
                </tspan>
            ))}
        </text>
    );
}

const WritingFeature = ({ feature, color }: FeatureProps<Writing>) => {
    const { x, y, width, height } = boxOf(feature, usePinchZoom());

    const chunks = feature.transcription.text.split("\n");

    return (
        <text
            transform={`rotate(90 ${x + width / 2} ${y + height / 2})`}
            x={x + width / 2}
            y={y + height / 2}
            fontSize={8}
            fill={color}
            textAnchor="middle"
            id={feature.id}
        >
            {chunks.map((chunk, i) => (
                <tspan key={i} x={x + width / 2} dy={i === 0 ? 0 : 12}>
                    {chunk}
                </tspan>
            ))}
        </text>
    );
};

const HoleFeature = ({ feature, onClick, color }: FeatureProps) => {
    const geometry = usePinchZoom();

    const isExpression = geometry.roleOf(feature.vertical.from)?.includes('expression')
    const { x, y, width, height } = boxOf(feature, geometry);

    if (isExpression) {
        return (
            <rect x={x} y={y} width={width} height={height} fill={color} id={feature.id} onClick={onClick} />
        )
    }
    return (
        <line
            x1={x + height / 2}
            y1={y + height / 2}
            x2={x + width - height / 2}
            y2={y + height / 2}
            stroke={color}
            strokeWidth={height}
            strokeLinecap="round"
            strokeDasharray={`2 4`}
            id={feature.id}
            onClick={onClick}
        />
    );
}

const MarkFeature = ({ feature, onClick }: FeatureProps) => {
    const { x, y, width } = boxOf(feature, usePinchZoom());

    if (!feature.depiction) return null;

    return (
        <image
            xlinkHref={feature.depiction.replace('default.jpg', 'gray.jpg')}
            x={x}
            y={y}
            width={width}
            data-id={feature.id}
            id={feature.id}
            onClick={onClick}
            filter={"url(#contrast-brightness)"}
        />
    );
}

