import {
    AnyFeature,
    GluedOn,
    Path,
    RollCopy,
    Writing,
} from "linked-rolls";
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx";
import { JSX, useContext, useLayoutEffect, useRef, useState } from "react";
import { RollGrid } from "./RollGrid.tsx";
import { Cursor } from "./Cursor.tsx";
import { EventDimension } from "./RollDesk.tsx";
import { Arguable } from "./Arguable.tsx";
import { EditionContext } from "../../providers/EditionContext.tsx";
import { ModificationView } from "./ModificationView.tsx";

interface IIIFInfo {
    "@id": string;
    height: number;
    width: number;
    tiles: { width: number; height: number; scaleFactors: number[] }[];
}

async function fetchIIIFInfo(url: string): Promise<IIIFInfo> {
    const response = await fetch(`${url}/info.json`);
    return response.json();
}

function pixelsToMM(pixels: number, dpi: number): number {
    const millimetersPerInch = 25.4;
    return (pixels / dpi) * millimetersPerInch;
}

async function tilesAsSVGImage(
    baseUrl: string,
    iiifInfo: IIIFInfo,
    holeSeparation: number,
    margins: { treble: number; bass: number },
    stretchX: number,
    trackToY: (track: number) => number,
    shiftOp: number,
    stretchOp: number
) {
    const dpi = 300.25;
    const width = iiifInfo.height;
    const stepSize = 10000

    const images: JSX.Element[] = [];
    const areas = [[0, 9], [10, 89], [90, 99]]
    for (const [from, to] of areas) {
        for (let x = 0; x < width; x += stepSize) {
            const y = Math.ceil((from + 2) * holeSeparation + margins.bass);
            const height = Math.ceil(holeSeparation * (to - from + 1));
            const region = `${y},${x},${height},${stepSize}`;
            const size = `256,`;
            const tileUrl = `${baseUrl}/${region}/${size}/270/default.jpg`;

            const svgX = (pixelsToMM(x, dpi) + shiftOp) * stretchX * stretchOp;
            const svgWidth = pixelsToMM(stepSize, dpi) * stretchX * stretchOp;
            if (trackToY(from) === null || trackToY(to) === null) {
                continue
            }
            const svgHeight = trackToY(from) - trackToY(to);

            images.push(
                <image
                    key={`tile_${to}_${x}`}
                    xlinkHref={tileUrl}
                    x={svgX}
                    y={trackToY(to)}
                    width={svgWidth}
                    height={svgHeight}
                    preserveAspectRatio="none"
                />
            );
        }
    }
    return images;
}

interface CopyFacsimileProps {
    copy: RollCopy;
    active: boolean;
    onClick: (e: AnyFeature) => void;
    onChange: (copy: RollCopy) => void;
    color: string;
    onSelectionDone: (dimension: EventDimension) => void;
    facsimile?: File;
    facsimileOpacity: number;
}

export const CopyFacsimile = ({
    copy,
    active,
    color,
    onClick,
    onSelectionDone,
    facsimile,
    facsimileOpacity,
}: CopyFacsimileProps) => {
    const { edition, apply } = useContext(EditionContext);
    const { zoom, trackHeight, trackToY } = usePinchZoom();
    const svgRef = useRef<SVGGElement>(null);

    const [tiles, setTiles] = useState<JSX.Element[]>();

    useLayoutEffect(() => {
        const renderIIIF = async () => {
            if (!svgRef.current) return;

            if (!copy.scan) return;
            const holeSeparation = copy.measurements.holeSeparation?.value
            const margins = copy.measurements.margins
            if (!holeSeparation || !margins) return;

            if (facsimileOpacity > 0) {
                if (!facsimile) {
                    const baseUrl = copy.scan;
                    const info = await fetchIIIFInfo(baseUrl);
                    const stretch = copy.conditions.find(c => c.type === 'paper-stretch')

                    setTiles(
                        await tilesAsSVGImage(
                            baseUrl,
                            info,
                            holeSeparation,
                            margins,
                            zoom,
                            trackToY,
                            copy.measurements.shift?.horizontal || 0,
                            stretch?.factor || 1
                        )
                    );
                } else {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const url = reader.result as string;
                        console.log("url=", url);
                        setTiles([
                            <image
                                className="facsimile"
                                key="facsimile"
                                xlinkHref={url}
                                x={0}
                                y={0}
                                width={1000}
                                height={500}
                            />,
                        ]);
                    };
                    reader.readAsDataURL(facsimile);
                }
            } else {
                setTiles([]);
            }
        };

        renderIIIF();
    }, [svgRef, trackHeight, zoom, copy, facsimile, trackToY]);

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

                <g className='facsimile' opacity={facsimileOpacity}>
                    {tiles}
                </g>

                <Cursor svgRef={svgRef} />

                {active && (
                    <RollGrid
                        selectionMode={active}
                        onSelectionDone={onSelectionDone}
                        width={100000}
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

            <KeyboardDivision />
        </>
    );
};

const KeyboardDivision = () => {
    const { trackToY } = usePinchZoom();

    const division = 54;
    const y = trackToY(division);

    return (
        <line
            x1={0}
            y1={y}
            x2={100000}
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
    const { translateX, trackToY, trackHeight, areaOf } = usePinchZoom();

    const x = translateX(feature.horizontal.from);
    const y = trackToY(feature.vertical.from);
    const width = translateX(feature.horizontal.to - feature.horizontal.from);
    let height = 0
    if (areaOf(feature.vertical.from)?.includes('expression')) {
        height = trackHeight.expression
    }
    else if (areaOf(feature.vertical.from)?.includes('note')) {
        height = trackHeight.note
    }
    else if (feature.vertical.to !== undefined) {
        height = trackToY(feature.vertical.to!) - trackToY(feature.vertical.from);
    }

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
    const { translateX, trackToY } = usePinchZoom();

    const x = translateX(feature.horizontal.from);
    const y = trackToY(feature.vertical.from);
    const width = translateX(feature.horizontal.to - feature.horizontal.from);
    const height = trackToY(feature.vertical.to!) - trackToY(feature.vertical.from);

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
    const { translateX, trackToY } = usePinchZoom();

    const x = translateX(feature.horizontal.from);
    const y = trackToY(feature.vertical.from);
    const width = translateX(feature.horizontal.to - feature.horizontal.from);
    const height = trackToY(feature.vertical.to!) - trackToY(feature.vertical.from);

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
    const { translateX, trackToY, trackHeight, areaOf } = usePinchZoom();

    const isExpression = areaOf(feature.vertical.from)?.includes('expression')

    const x = translateX(feature.horizontal.from);
    const y = trackToY(feature.vertical.from);
    const width = translateX(feature.horizontal.to - feature.horizontal.from);
    let height = 0
    if (isExpression) {
        height = trackHeight.expression
    }
    else if (areaOf(feature.vertical.from)?.includes('note')) {
        height = trackHeight.note
    }
    else if (feature.vertical.to !== undefined) {
        height = trackToY(feature.vertical.to!) - trackToY(feature.vertical.from);
    }

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
    const { translateX, trackToY } = usePinchZoom();

    if (!feature.depiction) return null;

    const x = translateX(feature.horizontal.from);
    const y = trackToY(feature.vertical.from);
    const width = translateX(feature.horizontal.to - feature.horizontal.from);

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

