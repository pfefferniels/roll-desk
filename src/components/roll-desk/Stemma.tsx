import { getAt, idOf, Motivation, Path, VersionType } from 'linked-rolls'
import { Box, Popover, Portal } from "@mui/material";
import { useContext, useLayoutEffect, useRef, useState } from "react"
import * as d3 from "d3";
import { ReactNode, SVGProps, useEffect } from "react";
import { Arguable } from './Arguable';
import { EditString } from './EditString';
import { EditionContext } from '../../providers/EditionContext';
import { useAssumption } from '../../hooks/useAssumption';
import { Legend } from './Legend';

interface Stemma {
    currentVersionId: string | undefined
    onClick: (versionId: string) => void
    onHoverMotivation: (motivation: Motivation | null) => void
}

export const Stemma = ({ onClick, onHoverMotivation, currentVersionId }: Stemma) => {
    const { edition, view } = useContext(EditionContext)
    const [nodes, setNodes] = useState<Node[]>([])
    const [links, setLinks] = useState<Link[]>([])

    const svgRef = useRef<SVGSVGElement>(null)
    const zoomLayerRef = useRef<SVGGElement>(null)
    const svgWidth = 400
    const svgHeight = 500

    useEffect(() => {
        if (!edition || !view) return

        const nodes: Node[] = []

        view.withGenerations()
            .forEach(version => {
                nodes.push({
                    id: version.id,
                    label: version.siglum,
                    type: version.type,
                    generation: version.generation,
                    overlayInfo: version.actor && (
                        <Box sx={{ p: 1 }}>
                            {version.actor && (
                                <Arguable
                                    path={['versions', edition.versions.findIndex(v => v.id === version.id), 'actor'] as const}
                                >
                                    Actor: <b>{version.actor.name}</b>
                                </Arguable>
                            )}
                        </Box>
                    )
                })
            })

        const links: Link[] = []
        edition.versions.forEach((version, versionIndex) => {
            if (!version.basedOn) return
            const basedOn = idOf(version.basedOn)

            version.motivations.forEach((_, motivationIndex) => {
                links.push({
                    source: nodes.find(n => n.id === version.id) || 'unknown',
                    target: nodes.find(n => n.id === basedOn) || 'unknown',
                    motivationPath: ['versions', versionIndex, 'motivations', motivationIndex],
                })
            })

            if (version.motivations.length === 0) {
                links.push({
                    source: nodes.find(n => n.id === version.id) || 'unknown',
                    target: nodes.find(n => n.id === basedOn) || 'unknown',
                })
            }
        })

        setLinks(links)
        calculatePositions(nodes, links, svgWidth, svgHeight).then(setNodes)
    }, [edition?.versions, view])

    useEffect(() => {
        if (!svgRef.current || !zoomLayerRef.current || nodes.length === 0) return

        const svg = d3.select(svgRef.current)
        const zoomLayer = d3.select(zoomLayerRef.current)

        const zoomed = (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
            zoomLayer.attr("transform", event.transform.toString())
        }

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.2, 5])        // min / max zoom
            .on("zoom", zoomed)

        svg.call(zoom)

        // ---- compute bounding box of all nodes ----
        const xs = nodes.map(n => n.x ?? 0)
        const ys = nodes.map(n => n.y ?? 0)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)

        const nodesWidth = maxX - minX || 1
        const nodesHeight = maxY - minY || 1

        const margin = 40
        const scale = Math.min(
            (svgWidth - 2 * margin) / nodesWidth,
            (svgHeight - 2 * margin) / nodesHeight
        )

        const midX = (minX + maxX) / 2
        const midY = (minY + maxY) / 2

        const initialTransform = d3.zoomIdentity
            .translate(svgWidth / 2, svgHeight / 2)
            .scale(scale)
            .translate(-midX, -midY)

        // apply initial “fit all nodes” transform
        svg.call(zoom.transform, initialTransform)

        return () => {
            svg.on(".zoom", null)
        }
    }, [nodes, svgWidth, svgHeight])

    return (
        <>
            <Legend />
            <svg
                width={svgWidth}
                height={svgHeight}
                ref={svgRef}
            >
                <defs>
                    <filter id="f1"
                        x="-100%" y="-100%"
                        width="300%" height="300%">
                        <feOffset in="SourceGraphic" dx="3" dy="3" />
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g ref={zoomLayerRef}>
                    <LinkContainer
                        links={links}
                        positionedNodes={nodes}
                        onHoverMotivation={onHoverMotivation}
                        onChange={() => {
                            setLinks([...links])
                        }}
                    />

                    {nodes.map((node, i) => (
                        <NavigationNode
                            key={`interpretation_${i}`}
                            node={node}
                            onClick={() => {
                                if (!edition) return
                                onClick(node.id)
                            }}
                            highlight={currentVersionId === node.id}
                        />
                    ))}
                </g>
            </svg>
        </>
    )
}


export interface Node extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    generation: number
    radius?: number;
    type: VersionType;
    overlayInfo?: ReactNode
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    index?: number;
    motivationPath?: Path
}

export const calculatePositions = async (
    nodes: Node[],
    links: Link[],
    width: number,
    height: number,
    n: number = 300
): Promise<Node[]> => {

    const rowGap = 200; // vertical distance between generations

    // fix y position based on generation
    nodes.forEach(node => {
        const y = 50 + node.generation * rowGap;
        node.y = y;
        (node as any).fy = y;               // <- fixed y, D3 won't move it
    });

    const simulation = d3
        .forceSimulation(nodes)
        .force(
            "link",
            d3
                .forceLink(links.filter(l => l.source !== 'unknown' && l.target !== 'unknown'))
                .id((d: any) => d.id)
                .strength(0.6)
        )
        .force("charge", d3.forceManyBody().strength(-200))
        .force(
            "x",
            d3.forceX<Node>()
                .x(width / 2)                  // roughly center each row
                .strength(0.01)
        )
        .force(
            "collide",
            d3.forceCollide<Node>(d => d.radius ?? 40)
                .strength(1)
        );

    simulation.stop();
    for (let i = 0; i < n; i++) simulation.tick();

    return nodes;
};


export function sortLinks(links: Link[]) {
    links.sort(function (a, b) {
        if (a.source > b.source) {
            return 1;
        }
        else if (a.source < b.source) {
            return -1;
        }
        else {
            if (a.target > b.target) {
                return 1;
            }
            if (a.target < b.target) {
                return -1;
            }
            else {
                return 0;
            }
        }
    });
}


export interface NavigationNodeProps extends SVGProps<SVGGElement> {
    node: Node
    highlight: boolean
}

export const NavigationNode = ({ node, highlight, ...svgProps }: NavigationNodeProps) => {
    const [hover, setHover] = useState(false)
    const elRef = useRef<SVGGElement>(null)

    return (
        <>
            <g
                {...svgProps}
                style={{
                    cursor: node.id !== '' ? 'pointer' : 'auto',
                    pointerEvents: 'auto'
                }}
                onClick={(e) => {
                    setHover(!hover)
                    svgProps.onClick?.(e)
                }}
                ref={elRef}
            >
                <circle
                    cx={node.x || 10}
                    cy={node.y || 10}
                    r={node.radius || (node.type === 'edition' ? 32 : 26)}
                    fill={node.type === 'edition' ? 'darkslategray' : '#8FB1FF'}
                    strokeWidth={highlight ? 3 : 0}
                    stroke='black'
                    strokeDasharray={highlight ? '3 2' : undefined}
                />
                <text
                    x={node.x || 10}
                    y={node.y || 10}
                    width={40}
                    height={40}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={14}
                    fill="white"
                >
                    {node.label}
                </text>

                {node.overlayInfo && (
                    <Portal>
                        <Popover
                            open={hover}
                            anchorEl={elRef.current}
                            onClose={() => setHover(false)}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            style={{ pointerEvents: 'none' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ pointerEvents: 'auto' }}>
                                {node.overlayInfo}
                            </div>
                        </Popover>
                    </Portal>
                )}
            </g>
        </>
    )
}

interface LinkContainerProps {
    positionedNodes: Node[];
    links: Link[];
    separationFactor?: number;
    onHoverMotivation: (motivation: Motivation | null) => void
    onChange: () => void
}

export const LinkContainer = ({
    positionedNodes,
    links,
    separationFactor,
    onHoverMotivation,
}: LinkContainerProps) => {
    const { edition } = useContext(EditionContext)

    // which source→target pair is currently exploded?
    const [expandedKey, setExpandedKey] = useState<string | null>(null)

    // group links by directed pair "sourceId->targetId"
    const grouped = new Map<
        string,
        { source: Node; target: Node; links: Link[] }
    >()

    links.forEach(link => {
        const source = positionedNodes.find(
            node => node.id === (link.source as Node).id
        )
        const target = positionedNodes.find(
            node => node.id === (link.target as Node).id
        )

        if (!source || !target || !source.x || !source.y || !target.x || !target.y) {
            return
        }

        const key = `${source.id}->${target.id}`
        if (!grouped.has(key)) {
            grouped.set(key, { source, target, links: [] })
        }
        grouped.get(key)!.links.push(link)
    })

    const groups = Array.from(grouped.entries())

    return (
        <>
            {groups.map(([key, group], gi) => {
                const { source, target, links: gLinks } = group

                const dx = (target.x! - source.x!)
                const dy = (target.y! - source.y!)
                const baseDr = Math.sqrt(dx * dx + dy * dy)

                const motivationLinks = gLinks.filter(l => l.motivationPath)
                const hasMotivations = motivationLinks.length > 0
                const isExpanded = expandedKey === key
                const total = motivationLinks.length
                const spacing = 100   // px distance between onion layers

                // when exploded, each motivation gets its own radius
                const k = separationFactor || 2.5

                const basePath = makeArcPath(source as Point, target as Point, baseDr)

                return (
                    <g
                        key={key}
                        onMouseEnter={() => hasMotivations && setExpandedKey(key)}
                        onMouseLeave={() => hasMotivations && setExpandedKey(null)}
                    >
                        {/* base arc: always there, but fades when exploded */}
                        <path
                            d={basePath}
                            fill="none"
                            stroke="lightgray"
                            strokeWidth={hasMotivations ? 8 : 4}
                            style={{
                                pointerEvents: 'auto',
                                opacity: isExpanded ? 0.1 : 0.8,
                                transition: 'opacity 250ms ease, stroke-width 250ms ease'
                            }}
                            strokeDasharray={hasMotivations ? undefined : '5 5'}
                        />

                        {/* links with NO motivations keep the simple arc / line only */}
                        {(!hasMotivations) && (
                            // nothing more to draw
                            null
                        )}

                        {/* exploded motivation arcs */}
                        {hasMotivations && motivationLinks.map((link, li) => {
                            const motivation = getAt<Motivation>(link.motivationPath!, edition)

                            // onion: radii symmetrically around baseDr
                            const offsetIndex = li - (total - 1) / 2        // e.g. -1, 0, 1 for 3 arcs
                            const dr = baseDr + offsetIndex * spacing

                            return (
                                <MotivationArc
                                    key={`motivation_${gi}_${li}`}
                                    source={{ x: source.x!, y: source.y! }}
                                    target={{ x: target.x!, y: target.y! }}
                                    radius={dr}
                                    motivationPath={link.motivationPath!}
                                    visible={isExpanded}
                                    svgProps={{
                                        onClick: () =>
                                            motivation && onHoverMotivation(motivation),
                                        onMouseLeave: () =>
                                            onHoverMotivation(null),
                                    }}
                                />
                            )
                        })}
                    </g>
                )
            })}
        </>
    )
}

type Point = { x: number, y: number }

const makeArcPath = (source: Point, target: Point, radius: number) =>
    `M ${source.x},${source.y}
   A ${radius},${radius} 0 0 0 ${target.x},${target.y}`;


type TPt = { x: number; y: number; angle: number };

function computeTextEndOnPath(
    tp: SVGTextPathElement,
    path: SVGPathElement
): TPt {
    const total = path.getTotalLength();

    const so = tp.startOffset?.baseVal;
    let start = 0;
    if (so) {
        console.log('so', so)
        if (so.unitType === SVGLength.SVG_LENGTHTYPE_PERCENTAGE) {
            start = (so.valueInSpecifiedUnits / 100) * total;
        } else {
            // already in user units (px)
            start = so.value;
        }
    }

    // --- rendered text length (kerning etc.) ---
    const textLen = (tp as unknown as SVGTextContentElement).getComputedTextLength();

    // --- account for text-anchor and direction (RTL/LTR) ---
    const parent = tp.parentElement;
    const anchor =
        tp.getAttribute("text-anchor") ||
        parent?.getAttribute("text-anchor") ||
        "start";

    let s = start;
    if (anchor === "start") s += textLen;
    else if (anchor === "middle") s += textLen / 2;

    // clamp to path and compute tangent angle
    s = Math.max(0, Math.min(total, s));
    const p1 = path.getPointAtLength(s);
    const p0 = path.getPointAtLength(Math.max(0, s - 1));
    const angle = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;

    return { x: p1.x, y: p1.y, angle };
}

interface ArcProps {
    source: Point
    radius: number
    target: Point
    motivationPath: Path
    svgProps?: SVGProps<SVGTextElement>
    visible?: boolean
}

export const MotivationArc = ({
    source,
    radius,
    target,
    motivationPath,
    svgProps,
    visible = false
}: ArcProps) => {
    const [editMotivation, setEditMotivation] = useState(false)

    const { apply } = useContext(EditionContext)
    const { assumption: motivation } = useAssumption(motivationPath) as { assumption?: Motivation }

    const elRef = useRef<SVGPathElement>(null)
    const textPathRef = useRef<SVGTextPathElement | null>(null);

    const [endPt, setEndPt] = useState<TPt | null>(null);

    // recompute whenever layout/font/path/text might change
    useLayoutEffect(() => {
        const path = elRef.current;
        const tp = textPathRef.current;
        console.log(path, tp)
        if (!path || !tp) return;

        const compute = () => setEndPt(computeTextEndOnPath(tp, path));
        compute();
    }, [motivation, source, target, radius]);

    const d = makeArcPath(source, target, radius);

    if (!motivation) return null

    const editCount =
        motivation['@annotation']?.belief.reasons
            .filter(r => r.type === 'meaningComprehension')
            .map(comprehensions => comprehensions.comprehends)
            .flat()
            .length

    const id = `arc_${motivation['@annotation']?.id || `${source.x}-${source.y}-${target.x}-${target.y}`}`

    return (
        <g>
            <path
                id={id}
                style={{
                    pointerEvents: visible ? 'auto' : 'none',
                    transition: 'stroke-opacity 250ms ease, stroke-width 250ms ease'
                }}
                ref={elRef}
                d={d}
                fill="none"
                stroke="black"
                strokeWidth={visible ? (editCount ? editCount * 2 : 15) : 0}
                strokeOpacity={visible ? 0.33 : 0}
            />

            <Portal>
                <EditString
                    open={editMotivation}
                    value={motivation.note}
                    onClose={() => setEditMotivation(false)}
                    onDone={(str) => {
                        apply(draft => {
                            const motivation = getAt<Motivation>(motivationPath, draft)
                            if (!motivation) return
                            motivation.note = str
                        })
                        setEditMotivation(false)
                    }}
                />
            </Portal>

            {visible && (
                <Arguable
                    path={motivationPath}
                    asSVG={{
                        buttonPlacement: endPt || { x: 0, y: 0, angle: 0 }
                    }}
                >
                    <text
                        style={{
                            cursor: 'pointer',
                            pointerEvents: visible ? 'auto' : 'none',
                            transition: 'opacity 200ms ease'
                        }}
                        opacity={visible ? 1 : 0}
                        {...svgProps}
                        onClick={(e) => {
                            if (e.metaKey || e.ctrlKey) {
                                setEditMotivation(true)
                            }
                            else {
                                svgProps?.onClick?.(e)
                            }
                        }}
                    >
                        <textPath
                            href={`#${id}`}
                            style={{ pointerEvents: 'auto' }}
                            fontSize={7}
                            startOffset={'15%'}
                            ref={textPathRef}
                        >
                            {motivation.note}
                        </textPath>
                    </text>
                </Arguable>
            )}
        </g>
    )
}

// any links with duplicate source and target get an incremented 'index'
export const setLinkIndices = (links: Link[]) => {
    const numberOfLinks: Map<string, number> = new Map()

    for (let i = 0; i < links.length; i++) {
        if (i != 0 &&
            links[i].source == links[i - 1].source &&
            links[i].target == links[i - 1].target) {
            links[i].index = links[i - 1].index! + 1;
        }
        else {
            links[i].index = 1;
        }

        const sourceToTarget = (links[i].source as Node).id + "," + (links[i].target as Node).id;
        const targetToSource = (links[i].target as Node).id + "," + (links[i].source as Node).id;

        if (numberOfLinks.get(targetToSource) !== undefined) {
            numberOfLinks.set(targetToSource, links[i].index!);
        }
        else {
            numberOfLinks.set(sourceToTarget, links[i].index!);
        }
    }

    return numberOfLinks;
}
