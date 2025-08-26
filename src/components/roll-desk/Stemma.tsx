import { assignGenerations, Edit, flat, isEdit, MeaningComprehension, Motivation, Version, VersionType } from 'linked-rolls'
import { Box, IconButton, Popover, Portal } from "@mui/material";
import { useLayoutEffect, useRef, useState } from "react"
import * as d3 from "d3";
import { ReactNode, SVGProps, useEffect } from "react";
import { Arguable } from './EditAssumption';
import { Edit as EditIcon } from '@mui/icons-material';
import { EditString } from './EditString';

export function chaikin(points: number[][], iterations = 2) {
    let pts = points;
    for (let k = 0; k < iterations; k++) {
        const next = [];
        for (let i = 0; i < pts.length; i++) {
            const [x0, y0] = pts[i];
            const [x1, y1] = pts[(i + 1) % pts.length];
            next.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1]);
            next.push([0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
        }
        pts = next;
    }
    return pts;
}

type Pt = [number, number];

function toSvgPath(poly: Pt[]): string {
    if (!poly.length) return '';
    const [x0, y0] = poly[0];
    const body = poly.slice(1).map(([x, y]) => `L ${x} ${y}`).join(' ');
    return `M ${x0} ${y0} ${body} Z`;
}

interface Stemma {
    versions: Version[]
    currentVersion?: Version
    onClick: (version: Version) => void
    onHoverMotivation: (motivation: Motivation<string> | null) => void
}

export const Stemma = ({ versions, onClick, onHoverMotivation }: Stemma) => {
    const [nodes, setNodes] = useState<Node[]>([])
    const [links, setLinks] = useState<Link[]>([])
    const [bboxes, setBBoxes] = useState<DOMRect[]>([])

    const svgRef = useRef<SVGSVGElement>(null)
    const svgWidth = 400
    const svgHeight = 400

    useEffect(() => {
        const nodes: Node[] = []
        assignGenerations(versions).forEach(version => {
            nodes.push({
                id: version.id,
                label: version.siglum,
                type: version.type,
                generation: version.generation,
                overlayInfo: (
                    <Box sx={{ p: 1 }}>
                        {version.actor && (
                            <Arguable
                                about={version.actor}
                                onChange={() => {
                                    setNodes([...nodes])
                                }}
                                viewOnly={false}
                            >
                                Actor: <b>{flat(version.actor).name}</b>
                            </Arguable>
                        )}

                        <div>
                            Type: <b>{version.type}</b>
                        </div>
                    </Box>
                )
            })
        })

        const links: Link[] = []
        for (const version of versions) {
            const basedOn = version.basedOn?.assigned
            if (!basedOn) continue
            for (const motivation of version.motivations) {
                links.push({
                    source: nodes.find(n => n.id === version.id) || 'unknown',
                    target: nodes.find(n => n.id === basedOn.id) || 'unknown',
                    motivation,
                })
            }
        }
        setLinks(links)
        calculatePositions(nodes, links, svgWidth, svgHeight).then(setNodes)
    }, [versions])

    useLayoutEffect(() => {
        const svg = svgRef.current
        if (!svg) return
        setBBoxes(Array
            .from(svg.querySelectorAll<SVGGraphicsElement>('path,circle,text'))
            .map(el => el.getBBox())
        )
    }, [nodes, links, svgWidth, svgHeight])

    return (
        <svg
            width={svgWidth} height={svgHeight}
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

            <svg ref={svgRef}>
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
                        onClick={() => onClick(versions.find(v => v.id === node.id)!)}
                    />
                ))}
            </svg>
        </svg>
    )
}


export interface Node extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    generation: number
    radius?: number;
    type: VersionType;
    highlight?: boolean
    overlayInfo?: ReactNode
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    index?: number;
    motivation: Motivation<string>
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
            .strength(0.2)
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
}

export const NavigationNode = ({ node, ...svgProps }: NavigationNodeProps) => {
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
                    fillOpacity={node.highlight === false ? 0.4 : 1}
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
            </g>
        </>
    )
}

interface LinkContainerProps {
    positionedNodes: Node[];
    links: Link[];
    separationFactor?: number;
    onHoverMotivation: (motivation: Motivation<string> | null) => void
    onChange: () => void
}

export const LinkContainer = ({ positionedNodes, links, separationFactor, onHoverMotivation, onChange }: LinkContainerProps) => {
    const numberOfLinks = setLinkIndices(links);

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
        if (totalNumberOfLinks === 0) {
            return (
                <line
                    key={`link_${i}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    strokeWidth={2}
                    stroke='gray'
                />
            )
        }
        if (totalNumberOfLinks >= 1) {
            dr = dr / (1 + ((separationFactor || 2.5) / totalNumberOfLinks) * (link.index - 1));
        }

        return (
            <MotivationArc
                key={`link_${i}`}
                source={{ x: source.x, y: source.y }}
                radius={dr}
                target={{ x: target.x, y: target.y }}
                motivation={link.motivation}
                onChange={() => onChange()}
                svgProps={{
                    onMouseEnter: () => onHoverMotivation(link.motivation),
                    onMouseLeave: () => onHoverMotivation(null),
                }}
            />
        )
    })
}

type Point = { x: number, y: number }

interface ArcProps {
    source: Point
    radius: number
    target: Point
    motivation: Motivation<string>
    svgProps?: SVGProps<SVGTextElement>
    onChange: (motivation: Motivation<string>) => void
}

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

export const MotivationArc = ({ source, radius, target, motivation, svgProps, onChange }: ArcProps) => {
    const [editMotivation, setEditMotivation] = useState(false)

    const elRef = useRef<SVGPathElement>(null)
    const textPathRef = useRef<SVGTextPathElement | null>(null);

    const [endPt, setEndPt] = useState<TPt | null>(null);

    // recompute whenever layout/font/path/text might change
    useLayoutEffect(() => {
        const path = elRef.current;
        const tp = textPathRef.current;
        console.log(path, tp)
        if (!path || !tp) return;

        console.log('recomputing endpt for', motivation.assigned)

        const compute = () => setEndPt(computeTextEndOnPath(tp, path));
        compute();
    }, [motivation, source, target, radius]);

    const d = 'M' + target.x + ',' + target.y +
        'A' + radius + ',' + radius + ' 0 0 0,' + source.x + ',' + source.y +
        'A' + radius + ',' + radius + ' 0 0 1,' + target.x + ',' + target.y;

    const editCount =
        motivation.belief?.reasons
            .filter((r): r is MeaningComprehension<Edit> => r.type === 'meaningComprehension')
            .map(comprehensions => comprehensions.comprehends)
            .flat()
            .length

    console.log('endpt', endPt)

    return (
        <g>
            <path
                id={`arc_${motivation.id}`}
                style={{ pointerEvents: 'auto' }}
                ref={elRef}
                d={d}
                fill="none"
                stroke="black"
                strokeWidth={editCount ? editCount * 3 : 15}
                strokeOpacity={0.33}
            />

            <Portal>
                <EditString
                    open={editMotivation}
                    value={flat(motivation)}
                    onClose={() => setEditMotivation(false)}
                    onDone={(str) => {
                        motivation.assigned = str
                        onChange({ ...motivation })
                        setEditMotivation(false)
                    }}
                />
            </Portal>

            <Arguable
                about={motivation}
                onChange={(motivation) => onChange(motivation)}
                viewOnly={false}
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
                        href={`#arc_${motivation.id}`}
                        style={{ pointerEvents: 'auto' }}
                        fontSize={12}
                        startOffset={'10%'}
                        ref={textPathRef}
                    >
                        {flat(motivation)}
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
