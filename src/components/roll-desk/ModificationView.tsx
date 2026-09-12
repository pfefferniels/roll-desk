import { AnyFeature, Modification } from "linked-rolls";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { SVGProps, useContext } from "react";
import { EditionContext } from "../../providers/EditionContext";
import { chaikin } from "../../helpers/concaveHull";
import { apart, convexHull, cornersOf, hullToSvgPath, middleOf, minus, along, padded, Point } from "../../helpers/drawing";
import { Svg, svg } from "../../helpers/units";
import { Arguable } from "./Arguable";
import { boxOf, Translation } from "../../helpers/rollGeometry";

/** A feature once it is known where on the drawing it was drawn, and how big. */
interface PlacedFeature {
    feature: AnyFeature
    center: Point
    diag: Svg
}

/** Features that sit close enough together to be spoken of as one group. */
interface FeatureCluster {
    centroid: Point
    features: AnyFeature[]
}


const getFeatureBBox = (feature: AnyFeature, translation: Translation) =>
    boxOf(feature, translation)

/**
 * Returns the convex hull of a set of 2D points, in counter-clockwise order.
 * If there are 0 or 1 points, returns a shallow copy of the input.
 */
interface ModificationGroupProps extends SVGProps<SVGGElement> {
    features: AnyFeature[];
    metadata: Modification;
}

const ModificationGroup = ({ features, metadata, ...svgProps }: ModificationGroupProps) => {
    const { view } = useContext(EditionContext);
    const translation = usePinchZoom();

    if (!view) return null;

    const margin = svg(10);

    const allPoints = features
        .map((feature) => getFeatureBBox(feature, translation))
        .flatMap((bbox) => cornersOf(padded(bbox, margin)));

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

            return {
                feature,
                center: middleOf(bbox),
                diag: svg(Math.hypot(bbox.width, bbox.height)),
            };
        })
        .filter((entry): entry is PlacedFeature => !!entry);

    const averageDiag =
        positionedEdits.reduce((sum, { diag }) => sum + diag, 0) /
        (positionedEdits.length || 1);
    const distanceThreshold = svg(Math.max(500, averageDiag * 1.5));

    const clusters: FeatureCluster[] = [];

    positionedEdits
        .sort((a, b) => a.center.x - b.center.x)
        .forEach(({ feature, center }) => {
            const nearest = clusters.reduce<{ cluster: FeatureCluster, distance: Svg } | undefined>(
                (best, cluster) => {
                    const distance = apart(cluster.centroid, center);
                    return !best || distance < best.distance ? { cluster, distance } : best;
                },
                undefined
            );

            if (nearest && nearest.distance <= distanceThreshold) {
                const { cluster } = nearest;
                const count = cluster.features.length;
                // The running mean, moved a share of the way towards the newcomer.
                cluster.centroid = along(cluster.centroid, minus(center, cluster.centroid), 1 / (count + 1));
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
