import { EditionView, FeatureOrPatch, MergeObstacle, mergeObstacle } from "linked-rolls"

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
 * What stands in the way of reading the selected features as one. Two
 * features stand in one act exactly when the view gives back the same act,
 * and `mergeFeatures` throws across two of them, so the act is asked here
 * before a merge is offered.
 */
export const mergeObstacleFor = (
    features: readonly FeatureOrPatch[],
    view?: EditionView
): MergeObstacle | undefined => {
    const acts = new Set(features.map(feature => view?.actOf(feature.id)))
    return acts.size > 1 ? 'different-acts' : mergeObstacle(features)
}
