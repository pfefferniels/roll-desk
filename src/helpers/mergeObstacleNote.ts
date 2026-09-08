import { MergeObstacle } from "linked-rolls"

const notes: Record<MergeObstacle, string> = {
    'fewer-than-two': 'Fewer than two features are selected.',
    'different-types': 'The features are not all of one type.',
    'different-tracks': 'The features do not lie on the same tracks.',
    'differing-conditions': 'The features state conditions that differ.',
    'unlike-features': 'The features differ in more than their place along the roll.'
}

/** What stands in the way of merging, said in a phrase the desk can show. */
export const mergeObstacleNote = (obstacle: MergeObstacle): string => notes[obstacle]
