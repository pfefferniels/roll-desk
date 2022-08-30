import { MSM } from "../Msm"
import { AbstractTransformer } from "./Transformer"

const physicalToSymbolic = (physicalDate: number, bpm: number, beatLength: number) => {
    return (physicalDate / 1000) * bpm * beatLength / 60
}

export class InterpolateSymbolicOrnamentation extends AbstractTransformer {
    public transform(msm: MSM, mpm: any): string {
        const ornaments = mpm.performance.global.dated.ornamentationMap.ornament.map((o: any) => o['@'])

        ornaments.forEach((o: any) => {
            const correspondingMsmNote = msm.notesAtDate(o.date)[0]

            o['frame.start'] = physicalToSymbolic(o['frame.start'], correspondingMsmNote.bpm || 60, correspondingMsmNote['bpm.beatLength'] || 720)
            o['frameLength'] = physicalToSymbolic(o['frameLength'], correspondingMsmNote.bpm || 60, correspondingMsmNote['bpm.beatLength'] || 720)
        })

        mpm.performance.global.dated.ornamentationMap.ornament = ornaments.map((o: any) => ({'@': o}))

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}
