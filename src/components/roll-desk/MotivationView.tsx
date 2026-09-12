import { Edit, Motivation } from "linked-rolls";
import { EditView, getEditBBoxes } from "./EditView";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { SVGProps, useContext } from "react";
import { EditionContext } from "../../providers/EditionContext";
import { chaikin } from "../../helpers/concaveHull";
import { apart, convexHull, cornersOf, hullToSvgPath, middleOf, minus, along, padded, Point } from "../../helpers/drawing";
import { getBoundingBox } from "../../helpers/getBoundingBox";
import { Svg, svg } from "../../helpers/units";

/** An edit once it is known where on the drawing it was drawn, and how big. */
interface PlacedEdit {
    edit: Edit
    center: Point
    diag: Svg
}

/** Edits that sit close enough together to be spoken of as one group. */
interface EditCluster {
    centroid: Point
    edits: Edit[]
}


/**
 * Returns the convex hull of a set of 2D points, in counter-clockwise order.
 * If there are 0 or 1 points, returns a shallow copy of the input.
 */
interface MotivationComprehensionProps extends SVGProps<SVGGElement> {
    edits: Edit[];
    expanded: boolean;
}

const MotivationComprehension = ({ edits, expanded, ...svgProps }: MotivationComprehensionProps) => {
    const { view } = useContext(EditionContext);
    const translation = usePinchZoom();

    if (!view) return null;

    const margin = svg(10);

    const allPoints = edits
        .map((edit) => getEditBBoxes(edit, view, translation).filter((bbox) => !!bbox))
        .flat()
        .flatMap((bbox) => cornersOf(padded(bbox, margin)));

    const hullPoints = chaikin(convexHull(allPoints), 8);
    const path = hullToSvgPath(hullPoints);

    const color = "gray";

    const hullFillOpacity = expanded ? 0.1 : 0.4;
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
    const translation = usePinchZoom();
    if (!view) return null;

    const edits = view
        .linksTo(motivation.id)
        .map(path => view.atPath<Edit>(path.slice(0, -1)))
        .filter(e => e !== null)

    const positionedEdits = edits
        .map((edit) => {
            const bboxes = getEditBBoxes(edit, view, translation).filter((bbox) => !!bbox);
            if (!bboxes.length) return null;

            const around = getBoundingBox(bboxes.flatMap(cornersOf));

            return {
                edit,
                center: middleOf(around),
                diag: svg(Math.hypot(around.width, around.height)),
            };
        })
        .filter((entry): entry is PlacedEdit => !!entry);

    const averageDiag =
        positionedEdits.reduce((sum, { diag }) => sum + diag, 0) /
        (positionedEdits.length || 1);
    const distanceThreshold = svg(Math.max(200, averageDiag * 1.5));

    const clusters: EditCluster[] = [];

    positionedEdits
        .sort((a, b) => a.center.x - b.center.x)
        .forEach(({ edit, center }) => {
            const nearest = clusters.reduce<{ cluster: EditCluster, distance: Svg } | undefined>(
                (best, cluster) => {
                    const distance = apart(cluster.centroid, center);
                    return !best || distance < best.distance ? { cluster, distance } : best;
                },
                undefined
            );

            if (nearest && nearest.distance <= distanceThreshold) {
                const { cluster } = nearest;
                const count = cluster.edits.length;
                // The running mean, moved a share of the way towards the newcomer.
                cluster.centroid = along(cluster.centroid, minus(center, cluster.centroid), 1 / (count + 1));
                cluster.edits.push(edit);
            } else {
                clusters.push({ centroid: center, edits: [edit] });
            }
        });

    const clusteredEdits = clusters.map((c) => c.edits);
    const positionedIds = new Set(positionedEdits.map(({ edit }) => edit.id));
    const missingEdits = edits.filter((edit) => !positionedIds.has(edit.id));
    if (missingEdits.length) {
        missingEdits.forEach((edit) => clusteredEdits.push([edit]));
    }

    const groups = clusteredEdits.length ? clusteredEdits : [edits];

    return (
        <g>
            {groups.map((comp, i) => (
                <MotivationComprehension
                    key={`${motivation.id}-${i}`}
                    edits={comp}
                    expanded={expanded}
                    {...svgProps}
                />
            ))}
        </g>
    );
}
