import { MPM, Ornament } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer } from "./Transformer"

const physicalToSymbolic = (physicalDate: number, bpm: number, beatLength: number) => {
    return (physicalDate / 1000) * bpm * beatLength / 60
}

export class InterpolateSymbolicOrnamentation extends AbstractTransformer {
    public transform(msm: MSM, mpm: MPM): string {
        const ornaments = mpm.getInstructions<Ornament>('global')

        ornaments.forEach((o: any) => {
            const correspondingMsmNote = msm.notesAtDate(o.date, 'global')[0]

            o['frame.start'] = physicalToSymbolic(o['frame.start'],
                correspondingMsmNote.bpm || 60,
                correspondingMsmNote['bpm.beatLength'] || 720)
            o['frameLength'] = physicalToSymbolic(o['frameLength'],
                correspondingMsmNote.bpm || 60,
                correspondingMsmNote['bpm.beatLength'] || 720)
        })

        // replace the existing physical instructions with symbolic ones
        mpm.removeInstructions<Ornament>('global')
        mpm.insertInstructions(ornaments, 'global')

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}
