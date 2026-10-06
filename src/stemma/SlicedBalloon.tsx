import { FocusEvent, ReactNode, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Popper } from "@mui/material";
import { pressable } from "../desk/pressable";

/** A 2D point in SVG user space. */
export type Pt = { x: number; y: number };

/** A slice with a weight (importance) used to size the slice. */
export type Slice = {
    id: string;
    count: number;
    description: string;
    selected?: boolean;
};

export type SlicedBalloonProps = {
    a: Pt;
    b: Pt;
    slices: Slice[];
    /** The slice the pointer is on, and nothing once it has left the balloon. */
    onSliceHover?: (slice: Slice | null) => void;
    onSliceClick?: (slice: Slice) => void;
    /**
     * Where the keyboard reaches the slices: a group drawn after the node
     * of the version, so that Tab comes to its motivations right after
     * it, while the slices themselves are drawn beneath every node. A
     * stemma holds dozens of motivations, which would stand between the
     * reader and every version after them, so only the version being
     * read is given one. Left out, the keyboard does not reach the slices.
     */
    keyboardLayer?: SVGGElement | null;
    /**
     * Drawn over the balloon and part of it as far as the pointer is
     * concerned, so that a mark lying on the balloon does not read as
     * having left it.
     */
    children?: ReactNode;
};

/** How far the balloon reaches from the line, as a part of its length: opened, and at rest. */
const openReach = 0.3;
const restReach = 0.05;

/**
 * Arrange indices so that the largest weights land in the middle.
 *
 * Strategy:
 * - Sort by count desc (stable by original index)
 * - Place into a target left-to-right array by filling from the center outward,
 *   alternating left/right.
 */
export function orderSlicesCenterWeighted(slices: readonly Slice[]): Slice[] {
    const withIdx = slices.map((s, i) => ({ ...s, __i: i }));
    withIdx.sort((p, q) => (q.count - p.count) || (p.__i - q.__i));

    const n = withIdx.length;
    const out: Array<(typeof withIdx)[number] | null> = Array.from({ length: n }, () => null);
    if (n === 0) return [];

    /** Whether a slot is spoken for, which a slot off the end counts as. */
    const taken = (i: number) => out[i] != null;

    const midL = Math.floor((n - 1) / 2);
    const midR = Math.ceil((n - 1) / 2);
    let left = midL;
    let right = midR;

    for (let k = 0; k < n; k++) {
        const s = withIdx[k];
        if (!s) continue;
        if (k === 0) {
            // Put the biggest at the center-left (or exact center if odd).
            out[left] = s;
            if (left === right) {
                left--;
                right++;
            } else {
                // even: next placement should go to center-right
                // keep left as midL (already filled), fill right next
            }
            continue;
        }

        // Alternate right then left as we expand.
        // This keeps the distribution symmetric.
        const placeRight = (k % 2 === 1);
        if (placeRight) {
            while (right < n && taken(right)) right++;
            if (right < n) out[right] = s;
            else {
                while (left >= 0 && taken(left)) left--;
                if (left >= 0) out[left] = s;
            }
        } else {
            while (left >= 0 && taken(left)) left--;
            if (left >= 0) out[left] = s;
            else {
                while (right < n && taken(right)) right++;
                if (right < n) out[right] = s;
            }
        }
    }

    return out.filter(slot => slot !== null);
}

/** How many edits a motivation holds, as the name of its slice says it. */
export const editCount = (count: number) => `${count} edit${count === 1 ? '' : 's'}`

/** How narrow a slice may be drawn, in the units the balloon is laid out in. */
const minSliceWidth = 6;

/** The share of the balloon a slice keeps whatever its count, never more than an equal share. */
const floorShare = (sliceCount: number, totalWidth: number) =>
    sliceCount > 0 ? Math.min(minSliceWidth / Math.max(totalWidth, 1), 1 / sliceCount) : 0;

/**
 * How much of the balloon a count claims.
 *
 * Taken as the logarithm rather than the count itself. A motivation
 * behind two hundred edits and one behind three sit in one balloon, and
 * drawn in proportion the first leaves the second no width at all. The
 * width therefore puts the motivations in order and says how far apart
 * they are in order of magnitude, not how many edits each holds.
 */
const weightOf = (count: number) =>
    Number.isFinite(count) && count > 0 ? Math.log1p(count) : 0;

/**
 * Computes signed offsets (along the perpendicular to AB) for all slice boundaries.
 *
 * If there are N slices, there are N+1 boundaries, from left to right.
 * - Offsets are centered around 0.
 * - Slice widths follow the weight of their count.
 *
 * A slice too narrow to be hit by the pointer is widened to the floor and
 * the others give up the difference in proportion, so the narrowest slices
 * state that they are the smallest rather than how small they are.
 */
export function computeSliceGeometry(slices: readonly Slice[], totalWidth: number) {
    const ordered = orderSlicesCenterWeighted(slices);
    const weights = ordered.map((s) => weightOf(s.count));
    const sum = weights.reduce((a, b) => a + b, 0);

    // If all weights are 0, fall back to equal widths.
    const shares = sum > 0
        ? weights.map((w) => w / sum)
        : ordered.map(() => (ordered.length ? 1 / ordered.length : 0));

    const floor = floorShare(ordered.length, totalWidth);
    const lifted = shares.map((share) => Math.max(share, floor));
    const liftedSum = lifted.reduce((a, b) => a + b, 0);
    const widths = lifted.map((width) => width / liftedSum);

    // Boundaries along width axis: from -0.5 to +0.5 in normalized units.
    const boundary = widths.reduce<number[]>(
        (so_far, width) => [...so_far, (so_far.at(-1) ?? 0) + width],
        [0]
    );

    return {
        orderedSlices: ordered,
        // normalized offsets in [-0.5,+0.5], centred on the line
        boundaryOffsets01: boundary.map((t) => t - 0.5),
    };
}

/** Vector helpers */
function sub(a: Pt, b: Pt): Pt { return { x: a.x - b.x, y: a.y - b.y }; }
function add(a: Pt, b: Pt): Pt { return { x: a.x + b.x, y: a.y + b.y }; }
function mul(a: Pt, k: number): Pt { return { x: a.x * k, y: a.y * k }; }
function len(v: Pt): number { return Math.hypot(v.x, v.y); }
function unit(v: Pt): Pt {
    const L = len(v);
    return L > 0 ? { x: v.x / L, y: v.y / L } : { x: 0, y: 0 };
}
function perp(v: Pt): Pt { return { x: -v.y, y: v.x }; }

/**
 * The control points of a boundary from A to B with a constant
 * perpendicular offset: at t=0.25 and t=0.75 along AB, shifted by the
 * offset along the perpendicular normal.
 */
function controlsOf(a: Pt, b: Pt, offset: number): [Pt, Pt] {
    const ab = sub(b, a);
    const L = len(ab);
    const v = unit(ab);
    const n = perp(v);

    return [
        add(add(a, mul(v, 0.25 * L)), mul(n, offset)),
        add(add(a, mul(v, 0.75 * L)), mul(n, offset))
    ];
}

/** Build a cubic Bezier boundary from A to B with a constant perpendicular offset. */
export function boundaryCubicPath(a: Pt, b: Pt, offset: number): string {
    const [c1, c2] = controlsOf(a, b, offset);

    // M A C c1 c2 B
    return `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
}

export function boundaryCubicPathReversed(a: Pt, b: Pt, offset: number): string {
    // Reverse direction: M B C c2 c1 A
    const [c1, c2] = controlsOf(a, b, offset);

    return `M ${b.x} ${b.y} C ${c2.x} ${c2.y} ${c1.x} ${c1.y} ${a.x} ${a.y}`;
}

/** The points at the shares of the way given along a boundary from A to B. */
function alongBoundary(a: Pt, b: Pt, offset: number, shares: readonly number[]): Pt[] {
    const [c1, c2] = controlsOf(a, b, offset);
    return shares.map(t => {
        const s = 1 - t;
        return add(
            add(mul(a, s * s * s), mul(c1, 3 * s * s * t)),
            add(mul(c2, 3 * s * t * t), mul(b, t * t * t))
        );
    });
}

/** How far the balloon reaches from the line to either side. */
const halfWidthOf = (a: Pt, b: Pt, open: boolean) =>
    (open ? openReach : restReach) * len(sub(b, a));

/**
 * A boundary carries its whole offset at its control points, so halfway
 * along the balloon it stands at three quarters of it.
 */
const midwayShare = 0.75;

/** How far the balloon at rest reaches from its line, halfway along where it is widest. */
export const restingReachOf = (a: Pt, b: Pt) =>
    halfWidthOf(a, b, false) * midwayShare;

/**
 * The outline of the balloon between A and B, opened or at rest, as a
 * polygon with the number of points given along each side.
 */
export function outlineOf(a: Pt, b: Pt, open: boolean, samples = 24): Pt[] {
    const half = halfWidthOf(a, b, open);
    const shares = Array.from({ length: samples + 1 }, (_, i) => i / samples);
    return [
        ...alongBoundary(a, b, -half, shares),
        ...alongBoundary(a, b, half, shares.slice(1, -1).reverse())
    ];
}

/**
 * Where a slice of the opened balloon sits: halfway along it, and across
 * it in the middle of the slice's own width. Nothing where the balloon
 * has no such slice.
 */
export function sliceCentre(a: Pt, b: Pt, slices: readonly Slice[], sliceId: string): Pt | undefined {
    const halfWidth = halfWidthOf(a, b, true);
    const { orderedSlices, boundaryOffsets01 } = computeSliceGeometry(slices, 2 * halfWidth);

    const at = orderedSlices.findIndex((slice) => slice.id === sliceId);
    const left = boundaryOffsets01[at];
    const right = boundaryOffsets01[at + 1];
    if (left === undefined || right === undefined) return undefined;

    const offset = (left + right) / 2 * 2 * halfWidth * midwayShare;
    const ab = sub(b, a);
    return add(add(a, mul(ab, 0.5)), mul(perp(unit(ab)), offset));
}

/**
 * Sliced balloon between A and B. Slice widths follow the weight of their
 * count. The largest slices are centered via ordering.
 *
 * The slices are always drawn and only their paint changes, so that the
 * shape under the pointer is never taken away and put back: nothing the
 * balloon shows is kept in an effect, and a pointer crossing it neither
 * makes it flicker nor loses the slice it is on.
 */
export function SlicedBalloon({ a, b, slices, onSliceHover, onSliceClick, keyboardLayer, children }: SlicedBalloonProps) {
    const [pointerInside, setPointerInside] = useState(false)
    const [pointerOn, setPointerOn] = useState<string>()
    const groupRef = useRef<SVGGElement>(null)
    const keysRef = useRef<SVGGElement>(null)

    // The balloon opens under the pointer, and stays open while something
    // elsewhere holds one of its slices, so that a motivation chosen on the
    // roll can be read here as well.
    const selected = slices.find(s => s.selected)
    const open = pointerInside || Boolean(selected)
    const current = slices.find(s => s.id === pointerOn) ?? selected

    const totalHalfWidth = halfWidthOf(a, b, open);

    const geom = useMemo(
        () => computeSliceGeometry(slices, 2 * totalHalfWidth),
        [slices, totalHalfWidth]
    );

    const boundaryOffsets = geom.boundaryOffsets01.map((t) => t * 2 * totalHalfWidth); // [-half,+half]

    const slicePaths = geom.orderedSlices.flatMap((s, i) => {
        const left = boundaryOffsets[i];
        const right = boundaryOffsets[i + 1];
        if (left === undefined || right === undefined) return [];
        const d = `${boundaryCubicPath(a, b, left)} ${boundaryCubicPathReversed(a, b, right)}`;
        return [{ slice: s, d }];
    });

    // Outer outline is the leftmost boundary + rightmost boundary reversed.
    const leftmost = boundaryOffsets.at(0) ?? 0;
    const rightmost = boundaryOffsets.at(-1) ?? 0;
    const outlineD = `${boundaryCubicPath(a, b, leftmost)} ${boundaryCubicPathReversed(a, b, rightmost)}`;

    /** The slice the pointer has moved onto, told to the parent once. */
    const goTo = (slice: Slice) => {
        if (slice.id === pointerOn) return
        setPointerOn(slice.id)
        onSliceHover?.(slice)
    }

    /**
     * Lets go of the slice once the focus has left the balloon, as the
     * pointer does once it has left it. Where the pointer already has, the
     * slice is let go of, and what is held now is held elsewhere.
     */
    const leaveByKeyboard = (event: FocusEvent) => {
        if (keysRef.current?.contains(event.relatedTarget) || pointerInside || !pointerOn) return
        setPointerOn(undefined)
        onSliceHover?.(null)
    }

    // What the keyboard reaches of each slice: its outline, unpainted and
    // passed over by the pointer, but named and ringed where it has the focus.
    // Reaching it takes the slice up as the pointer moving onto it does,
    // which opens the balloon.
    const keys = keyboardLayer && createPortal(
        <g ref={keysRef}>
            {slicePaths.map(({ slice, d }) => (
                <path
                    key={slice.id}
                    d={d}
                    fill='none'
                    pointerEvents='none'
                    className='slice'
                    aria-label={`Motivation: ${slice.description}, ${editCount(slice.count)}`}
                    {...pressable(() => onSliceClick?.(slice))}
                    onFocus={() => goTo(slice)}
                    onBlur={leaveByKeyboard}
                />
            ))}
        </g>,
        keyboardLayer
    )

    return (
        <g
            ref={groupRef}
            onMouseEnter={() => setPointerInside(true)}
            onMouseLeave={() => {
                setPointerInside(false)
                setPointerOn(undefined)
                onSliceHover?.(null)
            }}
        >
            <path d={outlineD} fill="gray" fillOpacity={open ? 0 : 0.5} />

            {slicePaths.map(({ slice, d }) => (
                <path
                    key={slice.id}
                    d={d}
                    fill="black"
                    fillOpacity={open ? (current?.id === slice.id ? 1 : 0.4) : 0}
                    stroke={open ? 'white' : 'none'}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                    // A slice is taken up by the pointer moving over it, not by
                    // the balloon opening under a pointer that came to a stop.
                    onMouseMove={() => { if (open) goTo(slice) }}
                    onClick={() => onSliceClick?.(slice)}
                />
            ))}

            {children}

            {keys}

            <Popper
                open={Boolean(current)}
                anchorEl={() => groupRef.current!}
                placement="left"
                sx={{ pointerEvents: 'none', zIndex: theme => theme.zIndex.tooltip }}
            >
                <div style={{
                    backgroundColor: '#ffffff',
                    padding: '4px 8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    maxWidth: 260,
                    fontSize: 14,
                }}>
                    {current?.description}
                </div>
            </Popper>
        </g>
    );
}
