import { Articulation, Asynchrony, DatedInstruction, Dynamics, MPM, Ornament, OrnamentDef, Part, Tempo } from "mpm-ts";
import { MEI } from ".";

const determinePlist = <T extends string>(instruction: DatedInstruction<T>, mei: MEI, part: Part) => {
    if (instruction.noteid) return [instruction.noteid]
    return mei.notesAtTime(instruction.date / 720)
        .filter(note => {
            if (part === 'global') return true
            return note.part - 1 === part
        })
        .map(note => `#${note.id}`)
}

const determineDynamics = (vol: number) => {
    if (vol < 35) return 'pp'
    if (vol < 45) return 'p'
    else if (vol < 55) return 'mp'
    else if (vol < 70) return 'f'
    else return 'ff'
}

export const enrichMEI = (mpm: MPM, mei: MEI) => {
    const parts = [0, 1, 'global'] as Part[]

    parts.forEach(part => {
        const dynamics = mpm.getInstructions<Dynamics>('dynamics', part)
        const ornaments = mpm.getInstructions<Ornament>('ornament', part)
        const tempos = mpm.getInstructions<Tempo>('tempo', part)
        const asynchronies = mpm.getInstructions<Asynchrony>('asynchrony', part)
        const articulations = mpm.getInstructions<Articulation>('articulation', part)

        let wasTransition = false
        for (let i = 0; i < dynamics.length; i++) {
            if (wasTransition) {
                wasTransition = false
                continue
            }

            const dynamics_ = dynamics[i]
            const plist = determinePlist(dynamics_, mei, part)
            if (!plist.length) return

            const vol = determineDynamics(+dynamics_.volume)

            if (dynamics_["transition.to"] && i < dynamics.length - 1) {
                const form = +dynamics_["transition.to"] > +dynamics_.volume ? 'cres' : 'dim'
                const endid = determinePlist(dynamics[i + 1], mei, part)[0]

                mei.insertMark(plist[0], 'hairpin', {
                    '@': {
                        resp: '#enrich-from-mpm',
                        corresp: '#' + dynamics_["xml:id"],
                        startid: plist[0],
                        endid,
                        form
                    },
                    '#': vol
                })
                wasTransition = true
            }
            if (i > 0 && determineDynamics(+dynamics[i - 1].volume) === vol) continue

            mei.insertMark(plist[0], 'dynam', {
                '@': {
                    resp: '#enrich-from-mpm',
                    corresp: '#' + dynamics_["xml:id"],
                    startid: plist[0],
                },
                '#': vol
            })
        }

        ornaments.forEach(ornament => {
            const plist = determinePlist(ornament, mei, part)
            if (!plist.length) return

            let order
            if (ornament["note.order"] === 'ascending pitch') order = 'up'
            else if (ornament['note.order'] === 'descending pitch') order = 'down'
            else return

            const definition = mpm.getDefinition('ornamentDef', ornament["name.ref"]) as OrnamentDef | null
            if (!definition) {
                console.log('Definition with ID', ornament['name.ref'], 'not found.')
                return
            }

            const frameLength = (definition && definition.frameLength) || 0

            if (frameLength < 20) return

            mei.insertMark(plist[0], 'arpeg', {
                '@': {
                    resp: '#enrich-from-mpm',
                    corresp: '#' + ornament["xml:id"],
                    plist: plist.join(' '),
                    order
                }
            })
        })

        tempos.forEach(tempo => {
            const plist = determinePlist(tempo, mei, part)
            if (!plist.length) return

            let change = ''
            if (tempo['transition.to']) {
                change = tempo['transition.to'] > tempo.bpm ? 'acc.' : 'rit.'
            }

            mei.insertMark(plist[0], 'tempo', {
                '@': {
                    resp: '#enrich-from-mpm',
                    corresp: '#' + tempo["xml:id"],
                    startid: plist[0]
                },
                rend: {
                    '#': `${tempo.bpm.toFixed(0)} ${change}`
                }
            })
        })

        asynchronies.forEach(asynchrony => {
            const offset = asynchrony['milliseconds.offset']
            let direction

            if (offset > 80) direction = '/'
            else if (offset < -80) direction = '\\'
            else return

            const plist = determinePlist(asynchrony, mei, part)
            if (!plist.length) return

            mei.insertMark(plist[0], 'dir', {
                '@': {
                    resp: '#enrich-from-mpm',
                    corresp: '#' + asynchrony["xml:id"],
                    startid: plist[0]
                },
                rend: {
                    '#': direction
                }
            })
        })

        articulations.forEach((articulation, i) => {
            let artic
            if (articulation.relativeDuration < 0.5) artic = 'stacc'
            else if (articulation.relativeDuration >= 1.0) artic = 'ten' // TODO: better a legato bow
            else artic = ''

            const plist = determinePlist(articulation, mei, part)
            if (!plist.length) return

            mei.insertMark(plist[0], 'artic', {
                '@': {
                    resp: '#enrich-from-mpm',
                    corresp: '#' + articulation["xml:id"],
                    artic,
                    plist: plist.join(' ')
                }
            })
        })
    })

    mei.update()
    return mei;
}
