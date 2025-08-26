import {
    flat,
    RollCopy,
    RollFeature
} from "linked-rolls";
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx";
import { useLayoutEffect, useRef, useState } from "react";
import { RollGrid } from "./RollGrid.tsx";
import { Cursor } from "./Cursor.tsx";
import { EventDimension } from "./RollDesk.tsx";
import useIsVisible from "../../hooks/useIsVisible.tsx";
import { Arguable } from "./EditAssumption.tsx";

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
            const y = Math.ceil(from * holeSeparation + margins.bass);
            const height = Math.ceil(holeSeparation * (to - from));
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
    onClick: (e: RollFeature) => void;
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
    onChange
}: CopyFacsimileProps) => {
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
                    const stretch = copy.conditions
                        .map(c => flat(c))
                        .find(c => c.type === 'paper-stretch')

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

    return (
        <>
            <g className="roll-copy" ref={svgRef}>
                <defs>
                    <filter id="invertFilter">
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

                {copy.features.map(feature => {
                    return (
                        <Feature
                            key={feature.id}
                            feature={feature}
                            onClick={() => onClick(feature)}
                            color={color}
                            showFacsimile={facsimileOpacity === 0}
                            onChange={() => {
                                onChange(copy.shallowClone())
                            }}
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

interface FeatureProps {
    feature: RollFeature;
    onClick: React.MouseEventHandler;
    onChange: (feature: RollFeature) => void;
    color: string;
    showFacsimile?: boolean
}

const Feature = ({ feature, onClick, color, showFacsimile, onChange }: FeatureProps) => {
    const ref = useRef<SVGRectElement>(null);
    const isVisible = useIsVisible(ref)
    const { translateX, trackToY, trackHeight } = usePinchZoom();

    const x = translateX(feature.horizontal.from);
    const y = trackToY(feature.vertical.from);
    const width = translateX(feature.horizontal.to - feature.horizontal.from);
    const height = feature.vertical.to === undefined
        ? trackHeight.note
        : trackToY(feature.vertical.to) - trackToY(feature.vertical.from);

    return (
        <g className="feature">
            {(showFacsimile && feature.annotates && isVisible) && (
                <image
                    xlinkHref={feature.annotates.replace('default.jpg', 'gray.jpg')}
                    x={x}
                    y={y}
                    width={width}
                    filter="url(#invertFilter)"
                    data-id={feature.id}
                    id={feature.id}
                    onClick={onClick}
                />
            )}

            <rect
                ref={ref}
                fill={color}
                fillOpacity={0.3}
                strokeWidth={0}
                x={x}
                y={y}
                width={width}
                height={height}
                data-id={feature.id}
                id={feature.id}
                onClick={onClick}
            />

            {feature.condition && (
                <foreignObject
                    x={x + 10}
                    y={y - 10}
                    width={200}
                    height={40}
                    fontSize={10}
                    transform={`rotate(-90 ${x} ${y})`}
                >
                    <Arguable about={feature.condition} viewOnly={false} onChange={condition => {
                        feature.condition = condition;
                        onChange(feature);
                    }}>
                        {flat(feature.condition).type.replaceAll('-', ' ')}
                    </Arguable>
                </foreignObject>
            )}
        </g>
    );
}
