import { SolidDataset, Thing, asUrl, getInteger, getThing, getUrl, getUrlAll } from "@inrupt/solid-client"
import { mer, midi } from "../../helpers/namespaces"
import { RDF } from "@inrupt/vocab-common-rdf"
import { PianoRoll, pitchToSitch } from "alignmenttool"

const tempoToTickTime = (event: Thing, ticksPerBeat: number) => {
    const microsecondsPerBeat = getInteger(event, midi('microsecondsPerBeat'))
    if (!microsecondsPerBeat) return 0

    const realTimePerBeat = microsecondsPerBeat / 1000000; // Convert to seconds
    return realTimePerBeat / ticksPerBeat;
}

/**
 * This function converts a MIDI-LD representation
 * into a PianoRoll object which can be passed to the
 * Alignment Tool.
 * 
 * @returns a `SolidDataset` containing the `Thing`s representing the MIDI file
 */
export const asPianoRoll = (piece: Thing, midiDataset: SolidDataset, rollTempo?: number): PianoRoll | null => {
    const sortEvents = (a?: Thing | null, b?: Thing | null) => {
        if (!a || !b) return 0

        let tickA = getInteger(a, midi('absoluteTick'))
        let tickB = getInteger(b, midi('absoluteTick'))

        if (getUrlAll(a, RDF.type).includes(mer('NoteEvent')) && !tickA) {
            const onsetUrl = getUrl(a, mer('has_onset'))
            if (onsetUrl) {
                const onset = getThing(midiDataset, onsetUrl)
                tickA = (onset && getInteger(onset, midi('absoluteTick')))
            }
        }

        if (getUrlAll(b, RDF.type).includes(mer('NoteEvent')) && !tickB) {
            const onsetUrl = getUrl(b, mer('has_onset'))
            if (onsetUrl) {
                const onset = getThing(midiDataset, onsetUrl)
                tickB = (onset && getInteger(onset, midi('absoluteTick')))
            }
        }

        return (tickA || 0) - (tickB || 0)
    }


    const ticksPerBeat = getInteger(piece, midi('resolution')) || 480

    const allEvents = []
    const trackUrls = getUrlAll(piece, midi('hasTrack'))

    // Get and sort all `SetTempoEvent`s
    const tempos: { tick: number, tempo: number }[] = []
    for (const trackUrl of trackUrls) {
        const trackThing = getThing(midiDataset, trackUrl)
        if (!trackThing) continue

        const eventUrls = getUrlAll(trackThing, midi('hasEvent'))
        const eventThings = eventUrls
            .map(url => getThing(midiDataset, url))
            .filter(event => event !== null && getUrlAll(event, RDF.type).includes(midi('SetTempoEvent')))
            .map(event => ({
                tick: getInteger(event!, midi('absoluteTick')) || 0,
                tempo: tempoToTickTime(event!, ticksPerBeat)
            }))

        tempos.push(...eventThings)
    }
    tempos.sort((a, b) => a.tick - b.tick)

    for (const trackUrl of trackUrls) {
        const trackThing = getThing(midiDataset, trackUrl)
        if (!trackThing) continue

        const eventUrls = getUrlAll(trackThing, midi('hasEvent'))
        const eventThings = eventUrls
            .map(url => getThing(midiDataset, url))
            .filter(event => event !== null)
            .sort(sortEvents)

        for (const event of eventThings) {
            if (!event) continue

            if (getUrlAll(event, RDF.type).includes(mer('NoteEvent'))) {
                const onsetUrl = getUrl(event, mer('has_onset'))
                const offsetUrl = getUrl(event, mer('has_offset'))
                if (!onsetUrl || !offsetUrl) continue

                const onset = getThing(midiDataset, onsetUrl)
                const offset = getThing(midiDataset, offsetUrl)
                if (!onset || !offset) continue

                const onsetTime = getInteger(onset, midi('absoluteTick')) || 0
                const offsetTime = getInteger(offset, midi('absoluteTick')) || 0
                const tempo = tempos.reverse().find(tempo => tempo.tick <= onsetTime)?.tempo || 0

                const pitch = getInteger(onset, midi('pitch')) || 0

                const onsetVelocity = getInteger(onset, midi('velocity')) || 0
                const offsetVelocity = getInteger(onset, midi('velocity')) || 0

                allEvents.push({
                    ontime: 0.0015 * onsetTime,
                    offtime: 0.0015 * offsetTime,
                    id: asUrl(event),
                    pitch: pitch,
                    sitch: pitchToSitch(pitch),
                    onvel: onsetVelocity,
                    offvel: offsetVelocity,
                    channel: 0,
                    endtime: 0.0015 * offsetTime,
                    label: asUrl(event)
                })
            }
        }
    }

    allEvents.sort((a, b) => a.ontime - b.ontime)

    const pr = new PianoRoll()
    pr.events = allEvents
    return pr
}
