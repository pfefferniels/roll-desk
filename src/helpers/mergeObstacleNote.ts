import { EditionView, FeatureOrPatch, MergeObstacle, mergeObstacle, mergeObstacleIn } from "linked-rolls"

const notes: Record<MergeObstacle, string> = {
    'fewer-than-two': 'Fewer than two features are selected.',
    'different-types': 'The features are not all of one type.',
    'different-tracks': 'The features do not lie on the same tracks.',
    'differing-conditions': 'The features state conditions that differ.',
    'unlike-features': 'The features differ in more than their place along the roll.',
    'different-acts': 'The features were brought about by different acts.'
}

/** What stands in the way of merging, said in a phrase the desk can show. */
export const mergeObstacleNote = (obstacle: MergeObstacle): string => notes[obstacle]

/**
 * What stands in the way of reading the selected features as one. The
 * view is asked where there is one, so that the desk offers a merge on
 * the same grounds `mergeFeatures` acts on, the acts included.
 */
export const mergeObstacleFor = (
    features: readonly FeatureOrPatch[],
    view?: EditionView
): MergeObstacle | undefined =>
    view
        ? mergeObstacleIn(view, features.map(feature => feature.id))
        : mergeObstacle(features)
