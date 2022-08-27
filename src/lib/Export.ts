import { MidiNote } from "./Performance"
import { AlignedPerformance } from "./AlignedPerformance"
import { Note, Score } from "./Score"
import { MSM } from "./Msm"

const asBPM = (arr: number[]) => arr.slice(1).map((n, i) => n - arr[i]).filter(n => n !== 0).map(d => +(60 / d).toFixed(3))

type Tempo = {
    'date': number,
    'bpm': number,
    'beatLength': number,
    'transition.to'?: number,
    'meanTempoAt'?: number
}

type Dynamics = {
    date: number,
    volume: number | string,
    'transition.to'?: number
}

type Ornament = {
    date: number,
    'name.ref': string,
    'note.order': string,
    'frame.milliseconds.start': number, 
    'frame.milliseconds.end': number,
    'scale': number
}

/**
 * Performs the interpolation of an aligned performance
 * into MPM.
 */
export class Interpolation {
    alignedPerformance: AlignedPerformance
    timingImprecision: number = 0

    /**
     * working copy of the MSM on which multiple 
     * operations are performed in the process of 
     * the alignment.
     */
    currentMSM: MSM

    /**
     * working copy of MPM which during the process of 
     * interpolation is gradually filled with MPM elements.
     */
    currentMPM: any

    constructor(alignedPerformance: AlignedPerformance, preferArpeggio: boolean) {
        this.alignedPerformance = alignedPerformance
        this.currentMSM = new MSM(alignedPerformance)

        const nParts = alignedPerformance.score?.countParts() || 0
        this.currentMPM = {
            "@": {
                xmlns: "http://www.cemfi.de/mpm/ns/1.0"
            },
            performance: {
                "@": {
                    name: '',
                    pulsesPerQuarter: 720
                },
                global: {
                    dated: {
                        'tempoMap': {},
                        'ornamentationMap': {},
                        'imprecisionMap.timing': {}
                    }
                },
                part: Array.from(Array(nParts).keys()).map(i => {
                    return {
                        "@": {
                            name: `part${i}`,
                            number: `${i + 1}`,
                            "midi.channel": `${i}`,
                            "midi.port": "0"
                        },
                        dated: {
                            dynamicsMap: {},
                            asynchronyMap: {},
                            ornamentationMap: {},
                            articulationMap: {}
                        }
                    }
                })
            }
        }


        // Welte-Mignon piano rolls e.g. have an avarage imprecision range of 10ms.
        this.timingImprecision = 10
    }

    exportImprecisionMapTiming(): any {
        return {
            // Welte-Mignon piano rolls have an avarage imprecision range of 10ms.
            'distribution.uniform': {
                '@': {
                    'date': 0.0,
                    'limit.lower': -0.5 * this.timingImprecision,
                    'limit.upper': 0.5 * this.timingImprecision
                }
            }
        }
    }

    private perform_prepareGlobalOrnamentation() {
        const isSorted = (arr: number[]) => {
            let direction = -(arr[0] - arr[1]);
            for (let [i, val] of arr.entries()) {
                direction = !direction ? -(arr[i - 1] - arr[i]) : direction;
                if (i === arr.length - 1)
                    return !direction ? 0 : direction / Math.abs(direction);
                else if ((val - arr[i + 1]) * direction > 0) return 0;
            }
        }

        const ornaments: Ornament[] = []

        const chords = this.currentMSM.asChords()
        for (const [date, arpeggioNotes] of Object.entries(chords)) {
            // TODO: can an arpeggio consist of only two notes?
            if (arpeggioNotes.length >= 2) {
                const sortedByOnset = arpeggioNotes.sort((a, b) => a['midi.onset'] - b['midi.onset'])

                const arpeggioDirection = isSorted(sortedByOnset.map(note => note["midi.pitch"]))
                let noteOrder = ''
                if (arpeggioDirection === 1) noteOrder = 'ascending pitch'
                else if (arpeggioDirection === -1) noteOrder = 'descending pitch'
                else noteOrder = sortedByOnset.map(note => `#${note["xml:id"]}`).join(' ')
                
                const duration = sortedByOnset[sortedByOnset.length-1]["midi.onset"] - sortedByOnset[0]["midi.onset"] 

                ornaments.push({
                    'date': +date,
                    'name.ref': 'neutralArpeggio',
                    'note.order': noteOrder,
                    'frame.milliseconds.start': (-duration/2) * 1000, 
                    'frame.milliseconds.end': (duration/2) * 1000,
                    scale: 0.0
                })

                const onsetSum = arpeggioNotes.map(note => note['midi.onset']).reduce((a, b) => a + b, 0)
                const avarageOnset = (onsetSum / arpeggioNotes.length) || 0

                arpeggioNotes.forEach(note => {
                    note['midi.onset'] = avarageOnset
                })
            }
        }

        this.currentMPM.performance.global.dated.ornamentationMap.ornament = ornaments.map(o => ({'@': o}))
    }

    private perform_interpolateTempo() {
        const beatLength = 720

        let tempos: Tempo[] = []

        const generatepPowFunction = (frameBegin: number, frameEnd: number, bpm: number, transitionTo: number, meanTempoAt: number) => {
            return (x: number) => Math.pow((x - frameBegin) / (frameEnd - frameBegin), Math.log(0.5) / Math.log(meanTempoAt)) * (transitionTo - bpm) + bpm;
        }

        type InterpolationPoint = {
            tstamp: number,
            bpm: number
        }

        function douglasPeucker(points: InterpolationPoint[], epsilon: number) {
            if (!points.length) {
                console.log('not enough notes present')
                return
            }

            const start = points[0]
            const end = points[points.length - 1]
            const meanTempo = (start.bpm + end.bpm) / 2

            console.log('douglasPeucker [', start.tstamp, '-', end.tstamp, '], [', start.bpm, '-', end.bpm, ']')

            // search for bpm value closest to meanTempo
            let optimal = Number.MAX_SAFE_INTEGER
            let meanTempoAtQstamp = 0;
            for (let i = 1; i < points.length - 1; i++) {
                const distance = Math.abs(points[i].bpm - meanTempo)
                if (distance < optimal) {
                    optimal = distance
                    meanTempoAtQstamp = points[i].tstamp;
                }
            }
            const fullDistance = end.tstamp - start.tstamp

            if (fullDistance > beatLength) {
                const meanTempoAt = (meanTempoAtQstamp - start.tstamp) / fullDistance

                // create a new tempo curve
                const powFunction = generatepPowFunction(start.tstamp, end.tstamp, start.bpm, end.bpm, meanTempoAt)

                // find point of maximum distance from this curve
                let dmax = 0
                let index = 0
                for (let i = 1; i < points.length - 1; i++) {
                    const d = Math.abs(points[i].bpm - powFunction(points[i].tstamp))
                    if (d > dmax) {
                        index = i
                        dmax = d
                    }
                }

                if (dmax > epsilon) {
                    douglasPeucker(points.slice(0, index + 1), epsilon)
                    douglasPeucker(points.slice(index), epsilon)
                }
                else {
                    tempos.push({
                        'date': start.tstamp,
                        'bpm': start.bpm,
                        'transition.to': end.bpm,
                        'beatLength': beatLength / 4,
                        'meanTempoAt': +meanTempoAt.toFixed(2)
                    })

                    // TODO if there is still a significant gap to epsilon
                    // try to compensate with a rubato
                }
            }
            else {
                tempos.push({
                    'date': start.tstamp,
                    'bpm': start.bpm,
                    'beatLength': beatLength / 4
                })

                // TODO map agogic structures below beat length 
                // with rubatoMap
            }
        }

        let onsets: number[] = []
        let tstamps: number[] = []
        for (let tstamp = 0; tstamp < Score.qstampToTstamp(this.alignedPerformance.score!.getMaxQstamp()); tstamp += beatLength) {
            const performedNotes = this.currentMSM.notesAtDate(tstamp)
            console.log('performedNotes=', performedNotes)

            if (performedNotes && performedNotes[0]) {
                onsets.push(performedNotes[0]["midi.onset"])
                tstamps.push(tstamp)
            }
            else {
                // TODO: if a qstamp has no notes, this probably 
                // indicates rests, possibly filling up to an upbeat.
                console.log('empty tstamp', tstamp)
            }
        }
        const bpms = asBPM(onsets)

        const points: InterpolationPoint[] = bpms.map((bpm, i) => ({
            tstamp: tstamps[i],
            bpm: bpm
        }))

        douglasPeucker(points, 4)

        this.currentMPM.performance.global.dated.tempoMap.tempo = tempos.map(t => ({ '@': t }))
    }

    private perform_finalizeGlobalOrnamentation() {

    }

    private perform_interpolateDynamics(part = 0) {
        type TimedVelocity = {
            qstamp: number,
            velocity: number | undefined
        }

        const performedVelocities =
            this.alignedPerformance.score?.allNotes()
                .filter((note: Note) => note.part === part)
                .map((note: Note): TimedVelocity => {
                    return {
                        qstamp: note.qstamp,
                        velocity: this.alignedPerformance.performedNoteAtId(note.id)?.velocity
                    }
                })

        if (!performedVelocities) return []

        // find trends
        const dynamics = performedVelocities.reduce((acc, curr, index, arr) => {
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
                date: 720 * curr.qstamp,
                volume: curr.velocity
            })
            return acc
        }, new Array<Dynamics>())

        this.currentMPM.performance.part[part].dated.dynamicsMap.dynamics = dynamics.map(d => ({ '@': d }))
    }

    exportMPM(performanceName: string, tempoReference: number, curvatureReference: number) {
        if (!this.alignedPerformance.score) return

        this.perform_prepareGlobalOrnamentation()
        this.perform_interpolateTempo()
        this.perform_finalizeGlobalOrnamentation()

        const nParts = this.alignedPerformance.score?.countParts() || 0
        for (let i = 0; i < nParts; i++) {
            this.perform_interpolateDynamics(i)
        }

        this.currentMPM.performance["@"].name = performanceName
        return this.currentMPM
    }
}
