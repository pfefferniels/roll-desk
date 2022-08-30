import { MSM } from "../Msm"
import { AbstractTransformer } from "./Transformer"

type Dynamics = {
    date: number,
    volume: number | string,
    'transition.to'?: number
}

export class InterpolateDynamicsMap extends AbstractTransformer {
    part: number 

    constructor(part: number) {
        super()
        this.part = part
    }

    public transform(msm: MSM, mpm: any): string {
        type TimedVelocity = {
            date: number,
            velocity: number | undefined
        }

        const performedVelocities =
            msm.allNotes.
                filter(n => n.part === this.part)
                .map((n): TimedVelocity => {
                    return {
                        date: n.date,
                        velocity: n['midi.velocity']
                    }
                })

        if (!performedVelocities) return 'no performed velocities found'

        // find trends
        const dynamics = performedVelocities.reduce((acc, curr) => {
            if (!curr.velocity) return acc

            // avoid doublettes
            if (acc[acc.length - 1] && curr.velocity === acc[acc.length - 1].volume) return acc

            // find trends
            const first = acc[acc.length - 2]
            const second = acc[acc.length - 1]
            if (first && second) {
                if ((first.volume < second.volume && second.volume < curr.velocity) || // crescendo trend
                    (first.volume > second.volume && second.volume > curr.velocity)) { // or decrescendo trend
                    // remove middle element (last in acc array)
                    // and insert a transitionTo in the one before
                    acc.pop()
                    first["transition.to"] = curr.velocity
                }
            }

            acc.push({
                date: curr.date,
                volume: curr.velocity
            })
            return acc
        }, new Array<Dynamics>())

        mpm.performance.part[this.part].dated.dynamicsMap.dynamics = dynamics.map(d => ({ '@': d }))

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}
