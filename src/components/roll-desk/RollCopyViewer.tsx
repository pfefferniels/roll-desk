import { Emulation, RollCopy } from "linked-rolls"
import type { AnyRollEvent } from "linked-rolls/lib/types.d.ts"
import { usePiano } from "react-pianosound"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Dynamics } from "./Dynamics.tsx"

interface IIIFInfo {
    '@id': string;
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

async function tilesAsSVGImage(baseUrl: string, info: IIIFInfo, stretchX: number, stretchY: number) {
    const dpi = 300.25
    // TODO: Calculate the zoom level that best matches the stretch factors
    const zoomLevel = 0;

    const tileSize = info.tiles[0].width;
    const scale = info.tiles[0].scaleFactors[zoomLevel];
    const scaledWidth = info.width / scale;
    const scaledHeight = info.height / scale;

    const totalHeightMM = pixelsToMM(info.width, dpi);

    const rows = Math.ceil(scaledHeight / tileSize);
    const cols = Math.ceil(scaledWidth / tileSize);

    const images = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const region = `${x * tileSize},${y * tileSize},${tileSize},${tileSize}`;
            const size = `${tileSize},`;
            const tileUrl = `${baseUrl}/${region}/${size}/270/default.jpg`;

            const newX = pixelsToMM(y * tileSize, dpi) * stretchX;
            const newY = totalHeightMM * stretchY - (pixelsToMM((x + 1) * tileSize, dpi) * stretchY);
            const width = pixelsToMM(tileSize, dpi) * stretchX;
            const height = pixelsToMM(tileSize, dpi) * stretchY;

            images.push((
                <image
                    key={`tile_${y}${x}`}
                    xlinkHref={tileUrl}
                    x={newX}
                    y={newY}
                    width={width}
                    height={height}
                    opacity={0.8}
                    viewBox={[0, 0, width, height].join(' ')}
                    preserveAspectRatio='none'
                />
            ));
        }
    }
    return images;
}

interface RollCopyViewerProps {
    copy: RollCopy
    onTop: boolean
    onClick: (e: AnyRollEvent) => void
    color: string
}

export const RollCopyViewer = ({ copy, onTop, color, onClick }: RollCopyViewerProps) => {
    const { translateX, translateY, zoom, trackHeight } = usePinchZoom()
    const { playSingleNote } = usePiano()
    const svgRef = useRef<SVGGElement>(null)

    const [tiles, setTiles] = useState<JSX.Element[]>()
    const [emulation, setEmulation] = useState<Emulation>()

    useLayoutEffect(() => {
        const baseUrl = 'https://stacks.stanford.edu/image/iiif/wv912mm2332%2Fwv912mm2332_0001/'

        const renderIIIF = async () => {
            if (!svgRef.current) return

            const info = await fetchIIIFInfo(baseUrl)
            setTiles(await tilesAsSVGImage(baseUrl, info, zoom, 1.7))
        }

        renderIIIF()
    }, [svgRef, trackHeight, zoom])

    useEffect(() => {
        // whenever the events change, update the emulation
        console.log('rerunning emulation')
        const newEmulation = new Emulation()
        newEmulation?.emulateFromRoll(copy.events.filter(e => e.type === 'note' || e.type === 'expression'))
        setEmulation(newEmulation)
    }, [copy])

    return (
        <>
            <g className='roll-copy' ref={svgRef}>
                {tiles}

                {copy.events.map((event) => (
                    <rect
                        key={event.id}
                        onClick={(e) => {
                            if (event.type === 'note') {
                                playSingleNote(event.hasPitch)
                            }

                            if (e.metaKey && event.annotates) {
                                window.open(event.annotates)
                                return
                            }

                            onClick(event)
                        }}
                        data-id={event.id}
                        id={event.id}
                        x={translateX(event.hasDimension.from)}
                        width={translateX(event.hasDimension.to) - translateX(event.hasDimension.from)}
                        height={5}
                        fillOpacity={onTop ? 0.8 : 0.4}
                        fill={onTop ? color : 'gray'}
                        y={translateY(100 - event.trackerHole)}>
                    </rect>
                ))}

                {emulation && <Dynamics forEmulation={emulation} color={color} />}
            </g>
        </>
    )
}

