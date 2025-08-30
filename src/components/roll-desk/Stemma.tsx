import { assignGenerations, Edit, Edition, flat, isEdit, MeaningComprehension, Motivation, Version, VersionType } from 'linked-rolls'
import { Box, IconButton, Popover, Portal } from "@mui/material";
import { useContext, useLayoutEffect, useRef, useState } from "react"
import * as d3 from "d3";
import { ReactNode, SVGProps, useEffect } from "react";
import { Arguable } from './Arguable';
import { Edit as EditIcon } from '@mui/icons-material';
import { EditString } from './EditString';
import { EditionContext } from '../../providers/EditionContext';
import { AssumptionPath, useAssumption } from '../../hooks/useAssumption';
import { getAt } from '../../helpers/path';

type Pt = [number, number];

interface Stemma {
    currentVersionId?: string
    onClick: (version: Version) => void
    onHoverMotivation: (motivation: Motivation<string> | null) => void
}

export const Stemma = ({ onClick, onHoverMotivation }: Stemma) => {
    const { edition, apply } = useContext(EditionContext)
    const [nodes, setNodes] = useState<Node[]>([])
    const [links, setLinks] = useState<Link[]>([])

    const svgRef = useRef<SVGSVGElement>(null)
    const svgWidth = 400
    const svgHeight = 400

    useEffect(() => {
        if (!edition) return

        const nodes: Node[] = []
        assignGenerations(edition.versions)
            .forEach(version => {
                nodes.push({
                    id: version.id,
                    label: version.siglum,
                    type: version.type,
                    generation: version.generation,
                    overlayInfo: (
                        <Box sx={{ p: 1 }}>
                            {version.actor && (
                                <Arguable
                                    path={['versions', edition.versions.indexOf(version), 'actor'] as const}
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
        edition.versions.forEach((version, versionIndex) => {
            version.motivations.forEach((_, motivationIndex) => {
                const basedOn = version.basedOn?.assigned
                if (!basedOn) return

                links.push({
                    source: nodes.find(n => n.id === version.id) || 'unknown',
                    target: nodes.find(n => n.id === basedOn.id) || 'unknown',
                    motivationPath: ['versions', versionIndex, 'motivations', motivationIndex],
                })
            })
        })

        setLinks(links)
        calculatePositions(nodes, links, svgWidth, svgHeight).then(setNodes)
    }, [edition?.versions])

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
                        onClick={() => {
                            if (!edition) return
                            onClick(edition.versions.find(v => v.id === node.id)!)
                        }}
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
    motivationPath: AssumptionPath
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

        const motivation = getAt<Edition, AssumptionPath>(link.motivationPath, edition) as Motivation<string>

        return (
            <MotivationArc
                key={`link_${i}`}
                source={{ x: source.x, y: source.y }}
                radius={dr}
                target={{ x: target.x, y: target.y }}
                motivationPath={link.motivationPath}
                svgProps={{
                    onMouseEnter: () => onHoverMotivation(motivation),
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
    motivationPath: AssumptionPath
    svgProps?: SVGProps<SVGTextElement>
}

export const MotivationArc = ({ source, radius, target, motivationPath, svgProps }: ArcProps) => {
    const [editMotivation, setEditMotivation] = useState(false)

    const { apply } = useContext(EditionContext)
    const { assumption: motivation } = useAssumption(motivationPath) as { assumption: Motivation<string> }

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
                        apply(
                            draft => {
                                const motivation = getAt<Edition, AssumptionPath>(motivationPath, draft) as Motivation<string>
                                motivation.assigned = str
                            }
                        )
                        setEditMotivation(false)
                    }}
                />
            </Portal>

            <Arguable
                path={motivationPath}
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
