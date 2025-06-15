import {
    flat,
    RollCopy,
    RollFeature
} from "linked-rolls";
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx";
import { useLayoutEffect, useRef, useState } from "react";
import { RollGrid } from "./RollGrid.tsx";
import { Cursor, FixedCursor } from "./Cursor.tsx";
import { EventDimension } from "./RollDesk.tsx";

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
    opacity: number,
    shiftOp: number,
    stretchOp: number
) {
    const dpi = 300.25;
    const width = iiifInfo.height;
    const stepSize = 10000

    const images: JSX.Element[] = [];
    for (let track = 0; track < 100; track++) {
        for (let x = 0; x < width; x += stepSize) {
            const y = Math.ceil(track * holeSeparation + margins.bass);
            const height = Math.ceil(holeSeparation);
            const region = `${y},${x},${height},${stepSize}`;
            const size = `10,`;
            const tileUrl = `${baseUrl}/${region}/${size}/270/default.jpg`;

            const svgX = (pixelsToMM(x, dpi) + shiftOp) * stretchX * stretchOp;
            const svgWidth = pixelsToMM(stepSize, dpi) * stretchX * stretchOp;
            if (trackToY(track) === null || trackToY(track + 1) === null) {
                continue
            }
            const svgHeight = trackToY(track) - trackToY(track + 1);

            images.push(
                <image
                    key={`tile_${track}_${x}`}
                    xlinkHref={tileUrl}
                    x={svgX}
                    y={trackToY(track)}
                    width={svgWidth}
                    height={svgHeight}
                    opacity={opacity}
                    preserveAspectRatio="none"
                />
            );
        }
    }
    return images;
}

interface CopyFacsimileProps {
    copy: RollCopy;
    position: number;
    onClick: (e: RollFeature) => void;
    color: string;
    onSelectionDone: (dimension: EventDimension) => void;
    fixedX: number;
    setFixedX: (fixedX: number) => void;
    facsimile?: File;
    facsimileOpacity: number;
}

export const CopyFacsimile = ({
    copy,
    position,
    color,
    onClick,
    onSelectionDone,
    fixedX,
    setFixedX,
    facsimile,
    facsimileOpacity,
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
                            facsimileOpacity,
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
    }, [svgRef, trackHeight, zoom, copy, facsimileOpacity, facsimile, trackToY]);

    return (
        <>
            <g className="roll-copy" ref={svgRef} opacity={1 / (position + 1)}>
                <g className='facsimile'>
                    {tiles}
                </g>

                {position === 0 && (
                    <RollGrid
                        selectionMode={position === 0}
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
                        />
                    )
                })}
            </g>

            <Cursor onFix={(x) => setFixedX(x)} svgRef={svgRef} />
            <FixedCursor fixedAt={fixedX} />

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
    color: string;
}

const Feature = ({ feature, onClick, color }: FeatureProps) => {
    const { translateX, trackToY, trackHeight } = usePinchZoom();

    const x = translateX(feature.horizontal.from);
    const y = trackToY(feature.vertical.from);
    const width = translateX(feature.horizontal.to - feature.horizontal.from);
    const height = feature.vertical.to === undefined
        ? trackHeight.note
        : trackToY(feature.vertical.to) - trackToY(feature.vertical.from);

    return (
        <g className="feature" data-id={feature.id} onClick={onClick}>
            <rect
                fill={color}
                fillOpacity={0.5}
                strokeWidth={0}
                x={x}
                y={y}
                width={width}
                height={height}
            />
        </g>
    );
}
