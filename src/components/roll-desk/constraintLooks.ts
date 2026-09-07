import { SVGAttributes } from "react"

type Look = SVGAttributes<SVGElement>

export const ink = 'dimgray'

export const alignmentLook: Look = { stroke: ink, strokeWidth: 0.8, strokeDasharray: '3 2', fill: 'none' }
export const pairLook: Look = { stroke: ink, strokeWidth: 0.8, fill: 'none' }
/** The measured place of a perforation the performance moves elsewhere. */
export const shadowLook: Look = { stroke: ink, strokeWidth: 0.6, strokeDasharray: '2 2', fill: 'none' }
export const problemLook: Look = { stroke: 'crimson', strokeWidth: 1, fill: 'none' }
