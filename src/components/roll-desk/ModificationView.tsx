import { AnyFeature, Modification } from "linked-rolls";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { SVGProps, useContext } from "react";
import { EditionContext } from "../../providers/EditionContext";
import { chaikin } from "../../helpers/concaveHull";
import { Point } from "../../helpers/kmeans";
import { Arguable } from "./Arguable";
import { boxOf, Translation } from "../../helpers/rollGeometry";

const getFeatureBBox = (feature: AnyFeature, translation: Translation) =>
    boxOf(feature, translation)

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

interface ModificationGroupProps extends SVGProps<SVGGElement> {
    features: AnyFeature[];
    metadata: Modification;
}

const ModificationGroup = ({ features, metadata, ...svgProps }: ModificationGroupProps) => {
    const { view } = useContext(EditionContext);
    const translation = usePinchZoom();

    if (!view) return null;

    const margin = 10;

    const allPoints = features
        .map((feature) => getFeatureBBox(feature, translation))
        .flatMap((bbox) => [
            { x: bbox.x - margin, y: bbox.y - margin },
            { x: bbox.x + bbox.width + margin, y: bbox.y - margin },
            { x: bbox.x + bbox.width + margin, y: bbox.y + bbox.height + margin },
            { x: bbox.x - margin, y: bbox.y + bbox.height + margin },
        ]);

    const hullPoints = chaikin(convexHull(allPoints), 8);
    const path = hullToSvgPath(hullPoints);

    const color = "gray";

    return (
        <g {...svgProps}>
            <path
                d={path}
                fill={color}
                fillOpacity={0.2}
                stroke='black'
                strokeWidth={1.0}
                strokeDasharray='4 2'
                style={{
                    transition: "transform 200ms ease-out, fill-opacity 200ms ease-out",
                }}
            />

            <foreignObject
                x={hullPoints[0]?.x || 0}
                y={(hullPoints[0]?.y || 0) - 5}
                width={300}
                height={100}
                fontSize={12}
                fill="white"
                paintOrder="stroke"
            >
                <div style={{ color: "black", backgroundColor: "rgba(255, 255, 255, 0.82)", borderRadius: "4px", padding: "4px", width: 'fit-content', height: 'fit-content', boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)" }}>
                    purpose: <b>{`${metadata.purpose || 'unknown'}`}</b>
                    {metadata.actor && (
                        <div>
                            <Arguable path={view.getPath(metadata.actor["@annotation"]?.id || '')?.slice(0, -1) || []}>
                                actor: <b>{metadata.actor.name}</b>
                            </Arguable>
                        </div>
                    )}
                </div>
            </foreignObject>
        </g>
    );
}

export interface ModificationViewProps extends SVGProps<SVGGElement> {
    modification: Modification;
}

export const ModificationView = ({
    modification,
    ...svgProps
}: ModificationViewProps) => {
    const { view } = useContext(EditionContext);
    const translation = usePinchZoom();
    if (!view) return null;

    if (modification.type === 'Removal') return null

    const features = modification.added
        .map(id => view.get<AnyFeature>(id))
        .filter(f => !!f)

    const positionedEdits = features
        .map((feature) => {
            const bbox = getFeatureBBox(feature, translation);
            if (!bbox) return null;

            const minX = bbox.x;
            const maxX = bbox.x + bbox.width;
            const minY = bbox.y;
            const maxY = bbox.y + bbox.height;

            return {
                feature,
                center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
                diag: Math.hypot(maxX - minX, maxY - minY),
            };
        })
        .filter((entry): entry is { feature: AnyFeature; center: Point; diag: number } => !!entry);

    const averageDiag =
        positionedEdits.reduce((sum, { diag }) => sum + diag, 0) /
        (positionedEdits.length || 1);
    const distanceThreshold = Math.max(500, averageDiag * 1.5);

    const clusters: { centroid: Point; features: AnyFeature[] }[] = [];

    positionedEdits
        .sort((a, b) => a.center.x - b.center.x)
        .forEach(({ feature, center }) => {
            let bestIndex = -1;
            let bestDistance = Infinity;

            clusters.forEach((cluster, idx) => {
                const dx = cluster.centroid.x - center.x;
                const dy = cluster.centroid.y - center.y;
                const dist = Math.hypot(dx, dy);
                if (dist < bestDistance) {
                    bestDistance = dist;
                    bestIndex = idx;
                }
            });

            if (bestIndex >= 0 && bestDistance <= distanceThreshold) {
                const cluster = clusters[bestIndex];
                const count = cluster.features.length;
                cluster.centroid = {
                    x: (cluster.centroid.x * count + center.x) / (count + 1),
                    y: (cluster.centroid.y * count + center.y) / (count + 1),
                };
                cluster.features.push(feature);
            } else {
                clusters.push({ centroid: center, features: [feature] });
            }
        });

    const clusteredFeatures = clusters.map((c) => c.features);
    const positionedIds = new Set(positionedEdits.map(({ feature }) => feature.id));
    const missingFeatures = features.filter((feature) => !positionedIds.has(feature.id));
    if (missingFeatures.length) {
        missingFeatures.forEach((feature) => clusteredFeatures.push([feature]));
    }

    const groups = clusteredFeatures.length ? clusteredFeatures : [features];

    return (
        <g>
            {groups.map((comp, i) => (
                <ModificationGroup
                    key={`${modification.added.join('-')}-${i}`}
                    features={comp}
                    metadata={modification}
                    {...svgProps}
                />
            ))}
        </g>
    );
}
