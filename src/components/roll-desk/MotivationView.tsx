import { Edit, Motivation } from "linked-rolls";
import { EditView, getEditBBoxes } from "./EditView";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { SVGProps, useContext } from "react";
import { EditionContext } from "../../providers/EditionContext";
import { chaikin } from "../../helpers/concaveHull";
import { Point } from "../../helpers/kmeans";

const determineType = (edits: Edit[]): "insert" | "delete" | "replace" => {
    const hasInsert = (e: Edit) => (e.insert?.length ?? 0) > 0;
    const hasDelete = (e: Edit) => (e.delete?.length ?? 0) > 0;

    if (edits.every((edit) => hasInsert(edit) && !hasDelete(edit))) return "insert";
    if (edits.every((edit) => hasDelete(edit) && !hasInsert(edit))) return "delete";
    return "replace";
};

function cross(o: Point, a: Point, b: Point): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Returns the convex hull of a set of 2D points, in counter-clockwise order.
 * If there are 0 or 1 points, returns a shallow copy of the input.
 */
export function convexHull(points: Point[]): Point[] {
    if (points.length <= 1) return [...points];

    // Sort by x, then y
    const pts = [...points].sort((a, b) =>
        a.x === b.x ? a.y - b.y : a.x - b.x
    );

    const lower: Point[] = [];
    for (const p of pts) {
        while (
            lower.length >= 2 &&
            cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
        ) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper: Point[] = [];
    for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        while (
            upper.length >= 2 &&
            cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
        ) {
            upper.pop();
        }
        upper.push(p);
    }

    // Last point of each list is the starting point of the other list
    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

function hullToSvgPath(hull: Point[]): string {
    if (hull.length === 0) return "";
    const [first, ...rest] = hull;
    const move = `M ${first.x} ${first.y}`;
    const lines = rest.map((p) => `L ${p.x} ${p.y}`).join(" ");
    return `${move} ${lines} Z`;
}

interface MotivationComprehensionProps extends SVGProps<SVGGElement> {
    edits: Edit[];
    expanded: boolean;
}

const MotivationComprehension = ({ edits, expanded, ...svgProps }: MotivationComprehensionProps) => {
    const { view } = useContext(EditionContext);
    const translation = usePinchZoom();

    if (!view) return null;

    const margin = 10;

    const allPoints = edits
        .map((edit) => getEditBBoxes(edit, view, translation).filter((bbox) => !!bbox))
        .flat()
        .flatMap((bbox) => [
            { x: bbox.x - margin, y: bbox.y - margin },
            { x: bbox.x + bbox.width + margin, y: bbox.y - margin },
            { x: bbox.x + bbox.width + margin, y: bbox.y + bbox.height + margin },
            { x: bbox.x - margin, y: bbox.y + bbox.height + margin },
        ]);

    const hullPoints = chaikin(convexHull(allPoints), 8);
    const path = hullToSvgPath(hullPoints);

    const color = "gray";

    const hullFillOpacity = expanded ? 0.1 : 0.44;
    const editsOpacity = expanded ? 1 : 0;
    const editsPointerEvents = expanded ? "auto" : "none";

    return (
        <g {...svgProps}>
            <g
                style={{
                    opacity: editsOpacity,
                    pointerEvents: editsPointerEvents,
                    transition: "opacity 180ms ease-out",
                }}
            >
                {edits.map((edit) => (
                    <EditView
                        key={`motivation_edit_${edit.id}`}
                        edit={edit}
                        onClick={() => { }}
                    />
                ))}
            </g>

            <path
                d={path}
                fill={color}
                fillOpacity={hullFillOpacity}
                style={{
                    transition: "transform 200ms ease-out, fill-opacity 200ms ease-out",
                }}
            />
        </g>
    );
}

export interface MotivationViewProps extends SVGProps<SVGGElement> {
    motivation: Motivation;
    expanded: boolean;
}

export const MotivationView = ({
    motivation,
    expanded,
    ...svgProps
}: MotivationViewProps) => {
    const { view } = useContext(EditionContext);
    if (!view) return null;

    const edits = view
        .linksTo(motivation.id)
        .map(path => view.atPath<Edit>(path.slice(0, -1)))
        .filter(e => e !== null)

    // TODO split into comprehensions through clustering algorithm
    const comprehensions = [edits]

    return (
        <g>
            {comprehensions.map((comp, i) => (
                <MotivationComprehension
                    key={JSON.stringify(comp)}
                    edits={edits}
                    expanded={expanded}
                    {...svgProps}
                />
            ))}
        </g>
    );
}

