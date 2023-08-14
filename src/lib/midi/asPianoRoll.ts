import { SolidDataset, Thing, asUrl, getInteger, getThing, getUrlAll } from "@inrupt/solid-client"
import { crm, midi } from "../../helpers/namespaces"
import { RDF } from "@inrupt/vocab-common-rdf"
import { PianoRoll, pitchToSitch } from "alignmenttool"


const tempoToTickTime = (event: Thing, ticksPerBeat: number) => {
    const microsecondsPerBeat = getInteger(event, midi('microsecondsPerBeat'))
    if (!microsecondsPerBeat) return 0

    const BPM = 60000000 / microsecondsPerBeat
    const realTimePerBeat = 60 / BPM
    return realTimePerBeat / ticksPerBeat
}


/**
 * This function converts a MIDI-LD representation
 * into a PianoRoll object which can be passed to the
 * Alignment Tool.
 * 
 * @returns a `SolidDataset` containing the `Thing`s representing the MIDI file
 */
export const asPianoRoll = (piece: Thing, midiDataset: SolidDataset): PianoRoll | null => {
    const ticksPerBeat = getInteger(piece, midi('resolution')) || 480

    const allEvents = []
    const trackUrls = getUrlAll(piece, midi('hasTrack'))
    for (const trackUrl of trackUrls) {
        const trackThing = getThing(midiDataset, trackUrl)
        if (!trackThing) continue

        const eventUrls = getUrlAll(trackThing, midi('hasEvent'))
        const eventThings = eventUrls
            .map(url => getThing(midiDataset, url))
            .filter(event => event !== null)
            .sort((a, b) => {
                const tickA =
                    getInteger(a!, crm('P82a_begin_of_the_begin')) ||
                    getInteger(a!, midi('absoluteTick')) ||
                    0
                const tickB =
                    getInteger(b!, crm('P82a_begin_of_the_begin')) ||
                    getInteger(b!, midi('absoluteTick')) ||
                    0
                return tickA - tickB
            })

        let currentTickTime = 0

        for (const event of eventThings) {
            if (!event) continue

            if (getUrlAll(event, RDF.type).includes(midi('SetTempoEvent'))) {
                currentTickTime = tempoToTickTime(event, ticksPerBeat)
            }
            else if (getUrlAll(event, crm('P2_has_type')).includes(midi('NoteEvent'))) {
                // TODO something is going wrong here, as currentTickTime seems
                // to be 0 permanently.
                const onset = getInteger(event, crm('P82a_begin_of_the_begin')) || 0
                const offset = getInteger(event, crm('P82b_end_of_the_end')) || 0
                const pitch = getInteger(event, midi('pitch')) || 0
                const velocity = getInteger(event, midi('velocity')) || 0

                allEvents.push({
                    ontime: (currentTickTime || 0.001) * onset,
                    offtime: (currentTickTime || 0.001) * offset,
                    id: asUrl(event),
                    pitch: pitch,
                    sitch: pitchToSitch(pitch),
                    onvel: velocity,
                    offvel: 0,
                    channel: 0,
                    endtime: currentTickTime * offset,
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
