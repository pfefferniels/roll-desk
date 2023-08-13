import { Articulation, Asynchrony, DatedInstruction, MPM, Part } from ".";
import { MEI } from "../mei";

const determinePlist = <T extends string>(instruction: DatedInstruction<T>, mei: MEI) => {
    if (instruction.noteid) return instruction.noteid
    return mei.notesAtTime(instruction.date / 720).map(note => `#${note.id}`).join(' ')
}

export const enrichMEI = (mpm: MPM, mei: MEI) => {
    const parts = [0, 1, 'global'] as Part[]

    parts.forEach(part => {
        const asynchronies = mpm.getInstructions<Asynchrony>('asynchrony', part)
        const articulations = mpm.getInstructions<Articulation>('articulation', part)

        asynchronies.forEach(asynchrony => {
            const offset = asynchrony['milliseconds.offset']
            let direction

            if (offset > 80) direction = '/'
            else if (offset < -80) direction = '\\'
            else return 

            const plist = determinePlist(asynchrony, mei)
    
            mei.insertMark(plist.split(' ')[0] || plist, 'dir', {
                '@': {
                    resp: '#enrich-from-mpm',
                    corresp: '#' + asynchrony["xml:id"],
                    plist
                },
                rend: {
                    '#': direction
                }
            })
        })

        articulations.forEach(articulation => {
            let artic
            if (articulation.relativeDuration < 0.5) artic = 'stacc'
            else if (articulation.relativeDuration > 1) artic = 'ten'
            else artic = ''
    
            const plist = determinePlist(articulation, mei)
    
            mei.insertMark(plist.split(' ')[0] || plist, 'artic', {
                '@': {
                    resp: '#enrich-from-mpm',
                    corresp: '#' + articulation["xml:id"],
                    artic,
                    plist
                }
            })
        })
    })

    mei.update()
    return mei;
}
