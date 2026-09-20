import { ReactNode, useMemo, useRef, useState } from "react";
import { Popper } from "@mui/material";

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
 * Build a cubic Bezier boundary from A to B with a constant perpendicular offset.
 *
 * The curve is controlled by points at t=0.25 and t=0.75 along AB,
 * shifted by offset along the perpendicular normal.
 */
export function boundaryCubicPath(a: Pt, b: Pt, offset: number): string {
    const ab = sub(b, a);
    const L = len(ab);
    const v = unit(ab);
    const n = perp(v);

    const c1 = add(add(a, mul(v, 0.25 * L)), mul(n, offset));
    const c2 = add(add(a, mul(v, 0.75 * L)), mul(n, offset));

    // M A C c1 c2 B
    return `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
}

export function boundaryCubicPathReversed(a: Pt, b: Pt, offset: number): string {
    // Reverse direction: M B C c2 c1 A
    const ab = sub(b, a);
    const L = len(ab);
    const v = unit(ab);
    const n = perp(v);

    const c1 = add(add(a, mul(v, 0.25 * L)), mul(n, offset));
    const c2 = add(add(a, mul(v, 0.75 * L)), mul(n, offset));

    return `M ${b.x} ${b.y} C ${c2.x} ${c2.y} ${c1.x} ${c1.y} ${a.x} ${a.y}`;
}

/** How far the balloon reaches from the line to either side. */
const halfWidthOf = (a: Pt, b: Pt, open: boolean) =>
    (open ? openReach : restReach) * len(sub(b, a));

/**
 * A boundary carries its whole offset at its control points, so halfway
 * along the balloon it stands at three quarters of it.
 */
const midwayShare = 0.75;

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
export function SlicedBalloon({ a, b, slices, onSliceHover, onSliceClick, children }: SlicedBalloonProps) {
    const [pointerInside, setPointerInside] = useState(false)
    const [pointerOn, setPointerOn] = useState<string>()
    const groupRef = useRef<SVGGElement>(null)

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
