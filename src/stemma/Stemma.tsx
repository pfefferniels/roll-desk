import { attestedVersions, Certainty, ConstraintProblem, derivationsOf, editsOf, idOf, Path, principalDerivationOf, siglaOf, systemIdOf, trackerBarOf, Version, versionIn, pathIn, withGenerations, Edition } from 'linked-rolls'
import { Box, Popover, Portal } from "@mui/material";
import { problemCount, problemsOfVersion } from '../constraints/constraints';
import { FocusEvent, Fragment, useCallback, useContext, useMemo, useRef, useState } from "react"
import * as d3 from "d3";
import { ReactNode, useEffect } from "react";
import { EditionContext } from '../edition/EditionContext';
import { Legend } from './Legend';
import { useSelection } from '../desk/SelectionContext';
import { outlineOf, restingReachOf, Slice, sliceCentre, SlicedBalloon } from './SlicedBalloon';
import { Clash, overlap, Shape, spreadApart, Thickened } from './spreading';
import { End, endAt, fieldOf, halfwayAlong, Obstacle, routeAround } from './routing';
import { Arguable } from '../accounts/Arguable';
import { along, perpendicular, point, Point, unit } from '../geometry/drawing';
import { HeldMotivation, isHeldMotivation, sameMotivation } from '../edition/motivation';
import { Svg, svg } from '../canvas/units';
import { pressable } from '../desk/pressable';
import { prefersReducedMotion } from '../desk/motion';

/** How far inside the drawing's edge a slice is brought when it is moved into view. */
const revealMargin = svg(40)

/**
 * How long that move takes, short enough to read as the drawing following
 * the pointer, and no time at all where the reader asked for less motion.
 */
const revealDuration = () => prefersReducedMotion() ? 0 : 300

interface Stemma {
    currentVersionId: string | undefined
    /** The constraint problems of the whole edition, counted per node. */
    problems?: readonly ConstraintProblem[]
    /** How tall the drawing is, which leaves room beneath it for what is written about a version. */
    height?: number
    onClick: (versionId: string) => void
}

export const Stemma = ({ onClick, currentVersionId, problems = [], height = 600 }: Stemma) => {
    const { edition } = useContext(EditionContext)
    const { selection } = useSelection(isHeldMotivation)

    const svgRef = useRef<SVGSVGElement>(null)
    const zoomLayerRef = useRef<SVGGElement>(null)
    /** Where the keyboard reaches the motivations of the version being read, right after its node. */
    const [motivationKeys, setMotivationKeys] = useState<SVGGElement | null>(null)
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>(null)
    const svgWidth = 300
    const svgHeight = height
    const versions = edition?.versions

    // Laid out while rendering, so that no link outlives the derivation its mark addresses.
    const { nodes, links, routes, fit } = useMemo(() => {
        if (!versions || !edition) {
            return { nodes: [], links: [], routes: new Map<Link, Point[]>(), fit: fitOf([], svgWidth, svgHeight) }
        }

        const graph = graphOf(withGenerations(edition), problems, {
            sigla: siglaOf(edition),
            attested: attestedVersions(edition)
        })
        const nodes = calculatePositions(graph.nodes, graph.links, svgWidth, svgHeight)
        return { links: graph.links, nodes, ...laidOut(nodes, graph.links, svgWidth, svgHeight) }
    }, [versions, edition, problems, svgHeight])

    useEffect(() => {
        if (!svgRef.current || !zoomLayerRef.current || nodes.length === 0) return

        const svg = d3.select(svgRef.current)
        const zoomLayer = d3.select(zoomLayerRef.current)

        const zoomed = (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
            zoomLayer.attr("transform", event.transform.toString())
        }

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.2, 5])
            .on("zoom", zoomed)

        svg.call(zoom)
        zoomRef.current = zoom

        const initialTransform = d3.zoomIdentity
            .translate(svgWidth / 2, svgHeight / 2)
            .scale(fit.scale)
            .translate(-fit.midX, -fit.midY)

        // apply initial “fit all nodes” transform
        // eslint-disable-next-line @typescript-eslint/unbound-method -- d3 means zoom.transform to be passed to `call`
        svg.call(zoom.transform, initialTransform)

        return () => {
            svg.on(".zoom", null)
            zoomRef.current = null
        }
    }, [nodes, fit, svgWidth, svgHeight])

    // The slice of the motivation in focus, which an edit on the roll puts
    // there by being hovered.
    const inFocus = useMemo(() => {
        const [held] = selection
        return held && edition ? sliceAt(held, { nodes, links }, edition) : undefined
    }, [selection, nodes, links, edition])

    /** Moves the drawing where the zoom has left a place on it, as the screen has it, off the edge. */
    const reveal = useCallback((at: Point) => {
        const zoom = zoomRef.current
        if (!zoom || !svgRef.current) return

        const shift = shiftIntoView(at, { width: svg(svgWidth), height: svg(svgHeight) }, revealMargin)
        if (!shift) return

        // `translateBy` moves the drawing in its own units, which the zoom
        // has scaled against the screen.
        const { k } = d3.zoomTransform(svgRef.current)
        zoom.translateBy(
            d3.select(svgRef.current).transition().duration(revealDuration()),
            shift.x / k,
            shift.y / k
        )
    }, [svgWidth, svgHeight])

    // A motivation chosen elsewhere is read on its slice, so the drawing
    // moves to it where the zoom has left it off the edge.
    useEffect(() => {
        if (!inFocus || !svgRef.current) return

        const [x, y] = d3.zoomTransform(svgRef.current).apply([inFocus.x, inFocus.y])
        reveal(point(svg(x), svg(y)))
    }, [inFocus, reveal])

    /**
     * Moves what the keyboard has reached into view, which the zoom may
     * have left off the edge. What a click focuses is where the pointer
     * already is.
     */
    const revealFocused = (event: FocusEvent<SVGGElement>) => {
        if (!svgRef.current || !event.target.matches(':focus-visible')) return

        const frame = svgRef.current.getBoundingClientRect()
        const box = event.target.getBoundingClientRect()
        reveal(point(svg(box.x + box.width / 2 - frame.x), svg(box.y + box.height / 2 - frame.y)))
    }

    // Tab takes the reader through the versions as the stemma is read:
    // generation by generation, and from left to right in each.
    const inReadingOrder = [...nodes].sort((a, b) => (a.generation - b.generation) || ((a.x ?? 0) - (b.x ?? 0)))

    return (
        <Box sx={{ position: 'relative', width: svgWidth, height: svgHeight, flexShrink: 0 }}>
            <div style={{ position: 'absolute', bottom: 0, right: 0, padding: '0.5rem', zIndex: 10 }}>
                <Legend />
            </div>
            <svg
                width={svgWidth}
                height={svgHeight}
                ref={svgRef}
                style={{ display: 'block' }}
                role='group'
                aria-label='Stemma of the versions'
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

                <g ref={zoomLayerRef} onFocus={revealFocused}>
                    <LinkContainer
                        links={links}
                        routes={routes}
                        positionedNodes={nodes}
                        markScale={1 / fit.scale}
                        onVersionClick={onClick}
                        currentVersionId={currentVersionId}
                        motivationKeys={motivationKeys}
                    />

                    {inReadingOrder.map(node => (
                        <Fragment key={node.id}>
                            <NavigationNode
                                node={node}
                                onOpen={() => {
                                    if (!edition) return
                                    onClick(node.id)
                                }}
                                highlight={currentVersionId === node.id}
                            />
                            {/*
                              React listens for focus on whatever it portals into, and
                              Chrome lets Tab stop at an SVG element listened to for focus,
                              unless it is told otherwise.
                            */}
                            {currentVersionId === node.id && <g ref={setMotivationKeys} tabIndex={-1} />}
                        </Fragment>
                    ))}
                </g>
            </svg>
        </Box>
    )
}


export interface Node extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    generation: number
    radius?: number;
    /** The reproducing system the version is coded for, named short. */
    system?: string
    /**
     * Whether the version names its system in the drawing. A version
     * inherits the system of the one it is based on, so only the root
     * and a version that changes system say which one they are in.
     */
    namesSystem?: boolean
    /**
     * Whether no copy's features carry the version at first hand. The
     * node is then drawn open, as a state read off its descendants
     * rather than off a copy.
     */
    inferred?: boolean
    /** How many constraint problems the version has. */
    troubles?: number
    overlayInfo?: ReactNode
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    index?: number;
    motivationPath?: Path
    /**
     * Whether the derivation crosses from one reproducing system to
     * another. That is a transfer rather than a revision: the whole
     * expression vocabulary is re-spelled, and the edits carry out a
     * rule stated on the version's creation.
     */
    transfer?: boolean

    /** How certainly the derivation is held. */
    certainty: Certainty

    /**
     * Whether the version's text is read against this derivation. The
     * others stand as hypotheses, drawn apart and carrying no motivations.
     */
    principal: boolean

    /** Where the derivation stands in the version's `basedOn`, which is how its belief is addressed. */
    derivation: number

    /** Whether a belief is stated of the derivation, which is then marked on the link. */
    believed: boolean

    /** Whether the derivation is drawn as a balloon sliced by its version's motivations, which a principal one with motivations is. */
    sliced: boolean
}

const sharesSystem = (a: Version, b: Version) =>
    systemIdOf(a.system) === systemIdOf(b.system)

/** What the drawing calls each version, and which of them a copy shows at first hand. */
export interface Naming {
    sigla: ReadonlyMap<string, string>
    attested: ReadonlySet<string>
}

/** The versions and their derivations, as the graph the stemma draws. */
export const graphOf = (
    versions: readonly (Version & { generation: number })[],
    problems: readonly ConstraintProblem[],
    { sigla, attested }: Naming
): { nodes: Node[], links: Link[] } => {
    const versionBy = (id: string) => versions.find(other => other.id === id)

    /** The version the text is read against. */
    const parentOf = (version: Version) => {
        const principal = principalDerivationOf(version)
        return principal && versionBy(idOf(principal))
    }

    const nodes: Node[] = versions.map(version => {
        const troubles = problemsOfVersion(problems, version.id).length
        const parent = parentOf(version)

        return {
            id: version.id,
            label: sigla.get(version.id) ?? '?',
            system: trackerBarOf(version.system)?.name,
            namesSystem: parent === undefined || !sharesSystem(parent, version),
            inferred: !attested.has(version.id),
            generation: version.generation,
            troubles,
            overlayInfo: troubles > 0
                ? <Box sx={{ p: 1 }}>{problemCount(troubles)}</Box>
                : null
        }
    })

    const nodeOf = (id: string) => nodes.find(node => node.id === id) || 'unknown'

    const links: Link[] = versions.flatMap(version => {
        const principal = parentOf(version)
        return derivationsOf(version).flatMap(({ parent, certainty, belief }, derivation): Link[] => {
            const target = versionBy(parent)
            if (!target) return []

            return [{
                source: nodeOf(version.id),
                target: nodeOf(target.id),
                transfer: !sharesSystem(target, version),
                certainty,
                principal: target === principal,
                derivation,
                believed: belief !== undefined,
                sliced: target === principal && version.motivations.length > 0
            }]
        })
    })

    return { nodes, links }
}

/**
 * The motivations a derivation's balloon is sliced by, each weighed by the
 * edits held under it and told whether it is one of those in focus.
 */
export const slicesOf = (version: Version, inFocus: readonly HeldMotivation[] = []): Slice[] => {
    const edits = editsOf(version)

    return version.motivations.map(motivation => ({
        id: motivation.id,
        count: edits.filter(edit => edit.motivation === motivation.id).length,
        description: motivation.note || 'No description',
        selected: inFocus.some(held => sameMotivation(held, { versionId: version.id, motivation }))
    }))
}

/** The version a node stands for, where the drawing has placed it. */
const placed = (nodes: readonly Node[], id: string): Point | undefined => {
    const node = nodes.find(node => node.id === id)
    return node?.x !== undefined && node.y !== undefined ? point(svg(node.x), svg(node.y)) : undefined
}

/**
 * Where the slice of a motivation is drawn: on the balloon of the
 * derivation the version holding it is read against. Nothing where that
 * derivation is not drawn, since a motivation has no place of its own.
 */
export const sliceAt = (
    held: HeldMotivation,
    { nodes, links }: { nodes: readonly Node[], links: readonly Link[] },
    edition: Edition
): Point | undefined => {
    const link = links.find(link => link.principal && (link.source as Node).id === held.versionId)
    const version = versionIn(edition, held.versionId)
    if (!link || !version) return undefined

    const source = placed(nodes, held.versionId)
    const target = placed(nodes, (link.target as Node).id)
    if (!source || !target) return undefined

    const centre = sliceCentre(source, target, slicesOf(version), held.motivation.id)
    return centre && point(svg(centre.x), svg(centre.y))
}

/** How far a place is moved along one axis to bring it inside, clear of the edge by the margin. */
const towardsView = (at: Svg, extent: Svg, margin: Svg): Svg => {
    if (at < margin) return svg(margin - at)
    if (at > extent - margin) return svg(extent - margin - at)
    return svg(0)
}

/** How far the drawing must move for a place on it to come into view, and nothing where it already is. */
export const shiftIntoView = (
    at: Point,
    viewport: { width: Svg, height: Svg },
    margin: Svg
): Point | undefined => {
    const shift = point(
        towardsView(at.x, viewport.width, margin),
        towardsView(at.y, viewport.height, margin)
    )
    return shift.x === 0 && shift.y === 0 ? undefined : shift
}

/** The scale and the centre that fit every place, a node's or a route's, into the drawing, with a margin left around them. */
export const fitOf = (places: readonly { x?: number, y?: number }[], width: number, height: number, margin = 40) => {
    const xs = places.map(place => place.x ?? 0)
    const ys = places.map(place => place.y ?? 0)
    if (xs.length === 0) return { scale: 1, midX: 0, midY: 0 }

    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    return {
        scale: Math.min((width - 2 * margin) / (maxX - minX || 1), (height - 2 * margin) / (maxY - minY || 1)),
        midX: (minX + maxX) / 2,
        midY: (minY + maxY) / 2
    }
}

/**
 * Where the mark of a derivation's belief sits: beside the place halfway
 * along the link, measured along it where it turns, clear of it by the
 * distance given.
 */
export const routeMarkAt = (route: readonly Point[], clearance: Svg): Point => {
    const halfway = halfwayAlong(route)
    if (!halfway) return point(svg(0), svg(0))
    const direction = unit(halfway.direction)
    return direction ? along(halfway.at, perpendicular(direction), clearance) : halfway.at
}

export const radiusOf = (node: Node) =>
    node.radius ?? 32

/**
 * Half the caption and the gap to the next one. Text cannot be
 * measured before it is drawn, so the width is estimated at the
 * 5.8 px a character of 10 px sans-serif takes on average.
 */
const captionHalfWidth = (node: Node) =>
    node.namesSystem && node.system ? node.system.length * 2.9 + 4 : 0

/** What a node claims of its row, caption included. */
const spaceFor = (node: Node) => Math.max(radiusOf(node), captionHalfWidth(node))

export const calculatePositions = (
    nodes: Node[],
    links: Link[],
    width: number,
    height: number,
    n: number = 300
): Node[] => {

    const rowGap = 200; // vertical distance between generations

    // fix y position based on generation
    nodes.forEach(node => {
        const y = 50 + node.generation * rowGap;
        node.y = y;
        node.fy = y;               // <- fixed y, D3 won't move it
    });

    const simulation = d3
        .forceSimulation(nodes)
        .force(
            "link",
            d3
                .forceLink<Node, Link>(links.filter(l => l.source !== 'unknown' && l.target !== 'unknown'))
                .id(d => d.id)
                .strength(link => link.principal ? 0.6 : 0.1)
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
            d3.forceCollide<Node>(spaceFor)
                .strength(1)
        );

    simulation.stop();
    for (let i = 0; i < n; i++) simulation.tick();

    return nodes;
};

/** How far below its node a caption's lettering sits, and how far it reaches above and below that. */
const captionDrop = 8
const captionReach = 6

/** Where a node's caption is drawn, as a line thickened to the height of its lettering, and nothing where it has none. */
const captionOf = (node: Node, at: Point): Thickened | undefined => {
    const half = captionHalfWidth(node)
    if (half === 0) return undefined

    const y = at.y + radiusOf(node) + captionDrop
    return { from: { x: at.x - half, y }, to: { x: at.x + half, y }, radius: captionReach }
}

/**
 * What a hypothesis is routed round: every version and the system it
 * names, and every derivation a text is read against, as wide as its
 * balloon at rest. Another hypothesis is no obstacle; two of them may
 * cross where they must.
 */
export const obstaclesOf = (nodes: readonly Node[], links: readonly Link[]): Obstacle[] => [
    ...nodes.flatMap(node => {
        const at = placed(nodes, node.id)
        if (!at) return []

        const disc = { from: at, to: at, radius: radiusOf(node), of: [node.id] }
        const caption = captionOf(node, at)
        if (!caption) return [disc]

        // Belonging to no version, a caption gives way to no route: a
        // route reaching its version comes in from another side.
        const { from, to, radius } = caption
        return [disc, { from: point(svg(from.x), svg(from.y)), to: point(svg(to.x), svg(to.y)), radius, of: [] }]
    }),
    ...links.filter(link => link.principal).flatMap(link => {
        const ids = [(link.source as Node).id, (link.target as Node).id]
        const [from, to] = ids.map(id => placed(nodes, id))
        return from && to ? [{ from, to, radius: restingReachOf(from, to), of: ids }] : []
    })
]

/**
 * The way each hypothesis takes from the version stating it to the one
 * it names, round the derivations, versions and captions in between.
 */
export const routesOf = (nodes: readonly Node[], links: readonly Link[]): Map<Link, Point[]> => {
    const obstacles = obstaclesOf(nodes, links)
    const field = fieldOf(obstacles)
    const endOf = (node: Node): End | undefined => {
        const at = placed(nodes, node.id)
        return at && endAt(node.id, at, radiusOf(node))
    }

    return new Map(links.filter(link => !link.principal).flatMap(link => {
        const from = endOf(link.source as Node)
        const to = endOf(link.target as Node)
        return from && to ? [[link, routeAround(from, to, obstacles, field)] as const] : []
    }))
}

/** How far on the screen the mark of a derivation's belief keeps from its link, clear of the balloon at rest. */
const markClearance = 16

/** How far on the screen the button of a belief's mark reaches from where the mark is placed. */
const markReach = 10

/** How far a derivation drawn as a line rather than a balloon reaches to either side. */
const lineReach = 2

/** How many points along each side a balloon's outline is tested at, opened and at rest. */
const openedSamples = 16
const restingSamples = 12

/** Something an opened balloon must keep off, the version heading the part of the stemma that moves with it, and how far across it lies. */
interface Piece {
    shape: Shape
    root: string
    x: number
    /** The derivation it belongs to, whose own balloon may cover it. */
    of?: Link
    /** The version it belongs to, whose own circle covers it where they meet. */
    node?: string
}

/**
 * What the opened balloon of each derivation runs into: another
 * derivation, the mark of another's belief, a version or its caption.
 * Balloons open one at a time, so the others are met at rest. Where a
 * version is drawn over both, the pointer lands on the version, so the
 * derivations meeting at it do not clash there. A mark keeps its size on
 * the screen, and is enlarged against the drawing by the scale given.
 */
export const clashesOf = (nodes: readonly Node[], links: readonly Link[], markScale: number): Clash[] => {
    const discs = nodes.flatMap(node => {
        const at = placed(nodes, node.id)
        return at ? [{ node, at }] : []
    })
    const coveredBesides = (id?: string) => (p: { x: number, y: number }) =>
        discs.some(({ node, at }) => node.id !== id && Math.hypot(p.x - at.x, p.y - at.y) < radiusOf(node))

    const derivations = links.filter(link => link.principal).flatMap(link => {
        const child = (link.source as Node).id
        const parent = (link.target as Node).id
        const a = placed(nodes, child)
        const b = placed(nodes, parent)
        return a && b ? [{ link, child, parent, a, b }] : []
    })

    const pieces: Piece[] = [
        ...derivations.map(({ link, child, a, b }) => ({
            shape: link.sliced ? { points: outlineOf(a, b, false, restingSamples) } : { from: a, to: b, radius: lineReach },
            root: child,
            x: (a.x + b.x) / 2,
            of: link
        })),
        ...derivations.filter(({ link }) => link.believed).map(({ link, child, a, b }) => {
            const at = routeMarkAt([a, b], svg(markClearance * markScale))
            return { shape: { from: at, to: at, radius: markReach * markScale }, root: child, x: at.x, of: link }
        }),
        ...discs.flatMap(({ node, at }) => {
            const caption = captionOf(node, at)
            return [{ from: at, to: at, radius: radiusOf(node) }, ...(caption ? [caption] : [])]
                .map(shape => ({ shape, root: node.id, x: at.x, node: node.id }))
        })
    ]

    return derivations.filter(({ link }) => link.sliced).flatMap(({ link, child, parent, a, b }) => {
        const opened = { points: outlineOf(a, b, true, openedSamples) }
        const x = (a.x + b.x) / 2
        return pieces
            .filter(piece => piece.of !== link && piece.node !== child && piece.node !== parent)
            .filter(piece => overlap(opened, piece.shape, coveredBesides(piece.node)))
            .map((piece): Clash => ({ movers: [child, piece.root], side: piece.x >= x ? 1 : -1 }))
    })
}

/**
 * Moves the versions apart sideways until no opened balloon runs into
 * anything, each with the versions descending from it. Says whether
 * anything moved.
 */
export const spreadVersions = (nodes: readonly Node[], links: readonly Link[], markScale: number): boolean => {
    const children = new Map<string, string[]>()
    for (const link of links.filter(link => link.principal)) {
        const parent = (link.target as Node).id
        children.set(parent, [...children.get(parent) ?? [], (link.source as Node).id])
    }
    return spreadApart(nodes, id => children.get(id) ?? [], () => clashesOf(nodes, links, markScale))
}

/** How many times spreading the versions and fitting the drawing are settled against each other at most. */
const settlings = 3

/**
 * The versions spread apart, the hypotheses routed round them, and the
 * scale and centre the drawing is fitted at. A mark keeps its size on the
 * screen, so how much room it takes on the drawing depends on the fit,
 * which spreading changes; the two are therefore settled in turn.
 */
export const laidOut = (nodes: readonly Node[], links: readonly Link[], width: number, height: number) => {
    let fit = fitOf(nodes, width, height)
    let routes = new Map<Link, Point[]>()
    for (let round = 0; round < settlings; round++) {
        const moved = spreadVersions(nodes, links, 1 / fit.scale)
        routes = routesOf(nodes, links)
        // A hypothesis may go round the outside of the stemma, and is fitted in with it.
        const next = fitOf([...nodes, ...[...routes.values()].flat()], width, height)
        const settled = !moved || next.scale >= fit.scale
        fit = next
        if (settled) break
    }
    return { routes, fit }
}

/** The curve a route is drawn as, through every place it turns at. */
const curveThrough = d3.line<Point>()
    .x(p => p.x)
    .y(p => p.y)
    .curve(d3.curveCatmullRom.alpha(0.5))

/**
 * What a node is called where it is not seen: the version by its siglum,
 * as the legend names an open node, the system it is coded for, and the
 * problems it has. The drawing names the system only where it changes,
 * but a reader going from node to node hears each one on its own.
 */
export const spokenNameOf = (node: Node): string => [
    `${node.inferred ? 'Inferred version' : 'Version'} ${node.label}`,
    node.system,
    node.troubles ? problemCount(node.troubles) : undefined
].filter(Boolean).join(', ')

export interface NavigationNodeProps {
    node: Node
    highlight: boolean
    /** Opens the version; left out where the node only stands for one, as in the legend. */
    onOpen?: () => void
}

export const NavigationNode = ({ node, highlight, onOpen }: NavigationNodeProps) => {
    const [hover, setHover] = useState(false)
    const elRef = useRef<SVGGElement>(null)

    // The problems a click shows in a popover are said in the node's name,
    // so the keyboard opens the version alone: the popover, being modal,
    // would take the focus away from the node.
    const control = onOpen && {
        ...pressable(onOpen),
        onClick: () => {
            setHover(!hover)
            onOpen()
        },
        'aria-label': spokenNameOf(node),
        'aria-current': highlight || undefined
    }

    return (
        <>
            <g
                {...control}
                style={{
                    cursor: node.id !== '' ? 'pointer' : 'auto',
                    pointerEvents: 'auto'
                }}
                ref={elRef}
            >
                {node.system && <title>{node.system}</title>}

                {/* Shown only while the keyboard is on the node, see App.css. */}
                {control && (
                    <circle
                        className='focusRing'
                        cx={node.x || 10}
                        cy={node.y || 10}
                        r={radiusOf(node) + 6}
                    />
                )}

                {highlight && (
                    <circle
                        cx={node.x || 10}
                        cy={node.y || 10}
                        r={radiusOf(node) + 3}
                        fill='none'
                        strokeWidth={2}
                        stroke='black'
                        strokeDasharray='3 2'
                    />
                )}
                <circle
                    cx={node.x || 10}
                    cy={node.y || 10}
                    r={radiusOf(node)}
                    fill={node.inferred ? 'white' : 'darkslategray'}
                    strokeWidth={node.inferred ? 2 : 0}
                    stroke='darkslategray'
                />
                <text
                    x={node.x || 10}
                    y={node.y || 10}
                    width={40}
                    height={40}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={14}
                    fill={node.inferred ? 'darkslategray' : 'white'}
                >
                    {node.label}
                </text>

                {node.system && node.namesSystem && (
                    <text
                        x={node.x || 10}
                        y={(node.y || 10) + radiusOf(node) + 12}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#555"
                        stroke="white"
                        strokeWidth={3}
                        paintOrder="stroke"
                    >
                        {node.system}
                    </text>
                )}

                {node.overlayInfo && (
                    <Portal>
                        <Popover
                            open={hover}
                            anchorEl={() => elRef.current!}
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

interface BeliefMarkProps {
    at: Point
    path: Path
    /** How much the mark is enlarged against the drawing. */
    scale: number
}

/** The mark of the belief a derivation is held under, centred on the point given. */
const BeliefMark = ({ at, path, scale }: BeliefMarkProps) => (
    <g transform={`translate(${at.x} ${at.y}) scale(${scale})`}>
        <Arguable asSVG={{ buttonPlacement: { x: -10, y: -10 } }} path={path}>
            {null}
        </Arguable>
    </g>
)

/**
 * The links in the order they are drawn, each with where it stands among
 * them. A derivation held as a hypothesis goes beneath every balloon: its
 * line crosses the stemma where it will, and drawn over a balloon it
 * would take the pointer off the slices.
 */
export const inDrawingOrder = (links: readonly Link[]) =>
    links
        .map((link, i) => ({ link, i }))
        .sort((a, b) => Number(a.link.principal) - Number(b.link.principal))

interface LinkContainerProps {
    positionedNodes: Node[];
    links: Link[];
    /** The way each hypothesis takes round the rest; one without is drawn straight. */
    routes: ReadonlyMap<Link, readonly Point[]>
    /**
     * How much a mark is enlarged against the drawing: the inverse of the
     * scale the drawing is fitted at, so that a mark keeps a size one can
     * click however many generations the stemma has to fit.
     */
    markScale: number
    onVersionClick: (versionId: string) => void
    /** The version being read, whose motivations alone the keyboard reaches. */
    currentVersionId?: string
    /** Where the keyboard reaches them, see `SlicedBalloon`. */
    motivationKeys?: SVGGElement | null
}

export const LinkContainer = ({
    positionedNodes,
    links,
    routes,
    markScale,
    onVersionClick,
    currentVersionId,
    motivationKeys,
}: LinkContainerProps) => {
    const { selection, setSelection } = useSelection(isHeldMotivation)
    const { edition } = useContext(EditionContext)

    return (
        <>
            {inDrawingOrder(links).map(({ link, i }) => {
                const source = positionedNodes.find(
                    node => node.id === (link.source as Node).id
                )
                const target = positionedNodes.find(
                    node => node.id === (link.target as Node).id
                )

                if (!source || !source.x || !source.y || !target || !target.x || !target.y) {
                    return null
                }

                const route = routes.get(link)
                    ?? [point(svg(source.x), svg(source.y)), point(svg(target.x), svg(target.y))]
                const versionPath = edition && pathIn(edition, source.id)
                const mark = link.believed && versionPath && (
                    <BeliefMark
                        at={routeMarkAt(route, svg(markClearance * markScale))}
                        path={[...versionPath, 'basedOn', link.derivation]}
                        scale={markScale}
                    />
                )

                if (!link.principal) {
                    const d = curveThrough([...route]) ?? undefined
                    return (
                        <g key={`link_${i}`}>
                            <g style={{ cursor: 'pointer' }} onClick={() => onVersionClick(source.id)}>
                                <title>{`Also derived from ${target.label}`}</title>
                                <path
                                    d={d}
                                    fill="none"
                                    stroke="#6b7280"
                                    strokeWidth={1.5}
                                    strokeDasharray="2 4"
                                />
                                <path
                                    d={d}
                                    fill="none"
                                    stroke="transparent"
                                    strokeWidth={12}
                                    pointerEvents="stroke"
                                />
                            </g>
                            {mark}
                        </g>
                    )
                }

                const version = edition && versionIn(edition, source.id)
                const motivations = version?.motivations ?? []

                return (
                    <g key={`link_${i}`}>
                        {link.transfer && (
                            <line
                                x1={source.x}
                                y1={source.y}
                                x2={target.x}
                                y2={target.y}
                                stroke="#b45309"
                                strokeWidth={2}
                                strokeDasharray="6 4"
                            >
                                <title>Transferred to another reproducing system</title>
                            </line>
                        )}
                        {motivations.length === 0 && !link.transfer && (
                            <line
                                x1={source.x}
                                y1={source.y}
                                x2={target.x}
                                y2={target.y}
                                stroke="gray"
                                strokeOpacity={0.5}
                                strokeWidth={2}
                            />
                        )}
                        {version && motivations.length > 0 ? (
                            <SlicedBalloon
                                slices={slicesOf(version, selection)}
                                a={{ x: source.x, y: source.y }}
                                b={{ x: target.x, y: target.y }}
                                keyboardLayer={source.id === currentVersionId ? motivationKeys : undefined}
                                onSliceHover={(slice) => {
                                    const m = slice && motivations.find(m => m.id === slice.id)
                                    setSelection(m ? [{ versionId: source.id, motivation: m }] : [])
                                }}
                                onSliceClick={(slice) => {
                                    const m = motivations.find(m => m.id === slice.id)
                                    if (!m) return
                                    onVersionClick(source.id)
                                    queueMicrotask(() =>
                                        setSelection([{ versionId: source.id, motivation: m }]))
                                }}
                            >
                                {mark}
                            </SlicedBalloon>
                        ) : mark}
                    </g>
                )
            })}
        </>
    )
}
