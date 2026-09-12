import { Motivation } from "linked-rolls"

export const isMotivation = (obj: unknown): obj is Motivation =>
    typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'motivation'
