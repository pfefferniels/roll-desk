import React, { useEffect, useMemo, useRef, useState } from "react";
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
    onSliceHover?: (slice: Slice | null) => void;
    onSliceClick?: (slice: Slice | null) => void;
};

/**
 * Arrange indices so that the largest weights land in the middle.
 *
 * Strategy:
 * - Sort by count desc (stable by original index)
 * - Place into a target left-to-right array by filling from the center outward,
 *   alternating left/right.
 */
export function orderSlicesCenterWeighted(slices: Slice[]): Slice[] {
    const withIdx = slices.map((s, i) => ({ ...s, __i: i }));
    withIdx.sort((p, q) => (q.count - p.count) || (p.__i - q.__i));

    const n = withIdx.length;
    const out: Array<(typeof withIdx)[number] | null> = Array(n).fill(null);
    if (n === 0) return [];

    const midL = Math.floor((n - 1) / 2);
    const midR = Math.ceil((n - 1) / 2);
    let left = midL;
    let right = midR;

    for (let k = 0; k < n; k++) {
        const s = withIdx[k];
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
            while (right < n && out[right] !== null) right++;
            if (right < n) out[right] = s;
            else {
                while (left >= 0 && out[left] !== null) left--;
                if (left >= 0) out[left] = s;
            }
        } else {
            while (left >= 0 && out[left] !== null) left--;
            if (left >= 0) out[left] = s;
            else {
                while (right < n && out[right] !== null) right++;
                if (right < n) out[right] = s;
            }
        }
    }

    return out.filter(Boolean) as Slice[];
}

/**
 * Computes signed offsets (along the perpendicular to AB) for all slice boundaries.
 *
 * If there are N slices, there are N+1 boundaries, from left to right.
 * - Offsets are centered around 0.
 * - Slice widths are proportional to count.
 *
 * Returns:
 *   orderedSlices: Slice[] (left->right)
 *   boundaryOffsets: number[] of length N+1 (left->right)
 *   halfWidth: number (max |offset|)
 */
export function computeSliceGeometry(slices: Slice[]) {
    const ordered = orderSlicesCenterWeighted(slices);
    const weights = ordered.map((s) => Math.max(0, Number.isFinite(s.count) ? s.count : 0));
    const sum = weights.reduce((a, b) => a + b, 0);

    // If all weights are 0, fall back to equal widths.
    const widths = sum > 0
        ? weights.map((w) => w / sum)
        : ordered.map(() => (ordered.length ? 1 / ordered.length : 0));

    // Boundaries along width axis: from -0.5 to +0.5 in normalized units.
    const boundary: number[] = [0];
    for (let i = 0; i < widths.length; i++) boundary.push(boundary[i] + widths[i]);

    // Center so that middle is 0: subtract 0.5.
    const centered = boundary.map((t) => t - 0.5);
    const halfWidth = Math.max(...centered.map((x) => Math.abs(x)), 0);

    return {
        orderedSlices: ordered,
        boundaryOffsets01: centered, // normalized offsets in [-0.5,+0.5]
        halfWidth01: halfWidth,
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

/**
 * Sliced balloon between A and B. Slice widths are proportional to count.
 * The largest slices are centered via ordering.
 */
export function SlicedBalloon({ a, b, slices, onSliceClick }: SlicedBalloonProps) {
    const [hovered, setHovered] = React.useState(false);
    const [currentSlice, setCurrentSlice] = useState<Slice>()
    const clickTime = useRef(0)
    const groupRef = useRef<SVGGElement>(null)

    const geom = useMemo(() => computeSliceGeometry(slices), [slices]);

    const ab = sub(b, a);
    const L = len(ab);
    const totalHalfWidth = (hovered ? 0.25 : 0.05) * L; // scale factor; tweak as desired.

    const boundaryOffsets = geom.boundaryOffsets01.map((t) => t * 2 * totalHalfWidth); // [-half,+half]

    // Compute bounds for a reasonable viewBox.
    const abUnit = unit(ab);
    const n = perp(abUnit);
    const allPts: Pt[] = [a, b];
    for (const off of boundaryOffsets) {
        allPts.push(add(add(a, mul(abUnit, 0.5 * L)), mul(n, off)));
    }

    const slicePaths = geom.orderedSlices.map((s, i) => {
        const left = boundaryOffsets[i];
        const right = boundaryOffsets[i + 1];
        const d = `${boundaryCubicPath(a, b, left)} ${boundaryCubicPathReversed(a, b, right)}`;
        return { slice: s, d };
    });

    // Outer outline is the leftmost boundary + rightmost boundary reversed.
    const outlineD = `${boundaryCubicPath(a, b, boundaryOffsets[0])} ${boundaryCubicPathReversed(a, b, boundaryOffsets[boundaryOffsets.length - 1])}`;

    useEffect(() => {
        if (slices.some(s => s.selected) && !currentSlice) {
            setCurrentSlice(slices.find(s => s.selected))
            setHovered(true)
        }
        else {
            setCurrentSlice(undefined)
            setHovered(false)
        }
    }, [slices])

    return (
        <g
            ref={groupRef}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => {
                setHovered(false)
                if (Date.now() - clickTime.current > 200) {
                    onSliceClick?.(null)
                }
            }}
        >
            {hovered ?
                (slicePaths.map(({ slice, d }) => (
                    <path
                        key={slice.id}
                        d={d}
                        fill={'black'}
                        fillOpacity={currentSlice?.id === slice.id ? 1 : 0.4}
                        stroke="white"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                        onMouseOver={() => {
                            setCurrentSlice(slice)
                        }}
                        onMouseLeave={() => {
                            setCurrentSlice(undefined)
                        }}
                        onClick={() => {
                            clickTime.current = Date.now()
                            onSliceClick?.(slice)
                        }}
                    />
                ))
                )
                : (<path
                    d={outlineD}
                    fill="gray"
                    fillOpacity={0.5}
                />)}
            <Popper
                open={Boolean(currentSlice)}
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
                    {currentSlice?.description}
                </div>
            </Popper>
        </g>
    );
}
