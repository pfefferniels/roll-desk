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
    const svgWidth = 500
    const svgHeight = 400

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

    // NEW: zoom / fit-to-nodes
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
    n: number = 1000
): Promise<Node[]> => {
    const simulation = d3
        .forceSimulation(nodes)
        .force("center", d3.forceCenter(width / 2, height / 2)
            .strength(0.3)
        )
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide<Node>(d => {
            if (d.radius) return d.radius;
            return 105
        }).strength(0.5))
        .force("link", d3
            .forceLink(links.filter(l => l.source !== 'unknown' && l.target !== 'unknown'))
            .strength(0.6)
            .id((d: any) => d.id))
        .force("positionX", d3.forceX<Node>()
            .x(d => d.generation * 2)
            .strength(1))
        .force("positionY", d3.forceY<Node>()
            .y(d => d.generation * 2)
            .strength(1)
        );

    simulation.restart();
    for (let i = 0; i < n; i++) {
        simulation.tick();
    }
    simulation.stop();

    return nodes;
}

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

export const LinkContainer = ({ positionedNodes, links, separationFactor, onHoverMotivation, onChange }: LinkContainerProps) => {
    const numberOfLinks = setLinkIndices(links);
    const { edition, apply } = useContext(EditionContext)


    return links.map((link, i) => {
        const source = positionedNodes.find(node => node.id === (link.source as Node).id);
        const target = positionedNodes.find(node => node.id === (link.target as Node).id);

        // console.log('source', source, 'target', target, 'link', link);

        if (!source || !target) {
            return null;
        }

        if (!source.x || !source.y || !target.x || !target.y) {
            return null;
        }

        if (!link.index) {
            return null
        }

        // the following code is inspired by 
        // https://github.com/zhanghuancs/D3.js-Node-MultiLinks-Node
        const dx = target.x - source.x
        const dy = target.y - source.y
        let dr = Math.sqrt(dx * dx + dy * dy);

        // get the total link numbers between source and target node
        const sourceToTarget = `${source.id},${target.id}`;
        const targetToSource = `${target.id},${source.id}`;

        const totalNumberOfLinks = numberOfLinks.get(sourceToTarget) || numberOfLinks.get(targetToSource) || 0
        if (totalNumberOfLinks >= 1) {
            dr = dr / (1 + ((separationFactor || 2.5) / totalNumberOfLinks) * (link.index - 1));
        }

        if (!link.motivationPath) {
            return (
                <line
                    key={`link_${i}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    strokeWidth={1}
                    strokeDasharray='5 5'
                    stroke='gray'
                />
            )
        }

        const motivation = getAt<Motivation>(link.motivationPath, edition)

        return (
            <MotivationArc
                key={`link_${i}`}
                source={{ x: source.x, y: source.y }}
                radius={dr}
                target={{ x: target.x, y: target.y }}
                motivationPath={link.motivationPath}
                svgProps={{
                    onMouseEnter: () => motivation && onHoverMotivation(motivation),
                    onMouseLeave: () => onHoverMotivation(null),
                }}
            />
        )
    })
}

type Point = { x: number, y: number }

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
}

export const MotivationArc = ({ source, radius, target, motivationPath, svgProps }: ArcProps) => {
    const [editMotivation, setEditMotivation] = useState(false)

    const { apply } = useContext(EditionContext)
    const { assumption: motivation } = useAssumption(motivationPath) as { assumption?: Motivation }
    console.log('motivation in arc', motivation)

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

    const d = 'M' + target.x + ',' + target.y +
        'A' + radius + ',' + radius + ' 0 0 0,' + source.x + ',' + source.y +
        'A' + radius + ',' + radius + ' 0 0 1,' + target.x + ',' + target.y;

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
                style={{ pointerEvents: 'auto' }}
                ref={elRef}
                d={d}
                fill="none"
                stroke="black"
                strokeWidth={editCount ? editCount * 2 : 15}
                strokeOpacity={0.33}
            />

            <Portal>
                <EditString
                    open={editMotivation}
                    value={motivation.note}
                    onClose={() => setEditMotivation(false)}
                    onDone={(str) => {
                        apply(
                            draft => {
                                const motivation = getAt<Motivation>(motivationPath, draft)
                                if (!motivation) return

                                motivation.note = str
                            }
                        )
                        setEditMotivation(false)
                    }}
                />
            </Portal>

            <Arguable
                path={motivationPath}
                asSVG={{
                    buttonPlacement: endPt || { x: 0, y: 0, angle: 0 }
                }}
            >
                <text
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    {...svgProps}
                    onClick={(e) => {
                        setEditMotivation(true)
                        svgProps?.onClick?.(e)
                    }}

                >
                    <textPath
                        href={`#${id}`}
                        style={{ pointerEvents: 'auto' }}
                        fontSize={8}
                        startOffset={'10%'}
                        ref={textPathRef}
                    >
                        {motivation.note}
                    </textPath>
                </text>
            </Arguable>
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
