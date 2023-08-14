import { SolidDataset, Thing, asUrl, getInteger, getThing, getUrl, getUrlAll } from "@inrupt/solid-client"
import { crm, mer, midi } from "../../helpers/namespaces"
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
                if (!a || !b) return 0

                let tickA = getInteger(a, midi('absoluteTick')) || 0
                let tickB = getInteger(b, midi('absoluteTick')) || 0

                if (getUrlAll(a, RDF.type).includes(mer('NoteEvent')) && !tickA) {
                    const onsetUrl = getUrl(a, mer('has_onset'))
                    if (onsetUrl) {
                        const onset = getThing(midiDataset, onsetUrl)
                        tickA = (onset && getInteger(onset, midi('absoluteTick'))) || 0
                    }
                }

                if (getUrlAll(b, RDF.type).includes(mer('NoteEvent')) && !tickB) {
                    const onsetUrl = getUrl(b, mer('has_onset'))
                    if (onsetUrl) {
                        const onset = getThing(midiDataset, onsetUrl)
                        tickB = (onset && getInteger(onset, midi('absoluteTick'))) || 0
                    }
                }


                return tickA - tickB
            })

        let currentTickTime = 0

        for (const event of eventThings) {
            if (!event) continue

            if (getUrlAll(event, RDF.type).includes(midi('SetTempoEvent'))) {
                currentTickTime = tempoToTickTime(event, ticksPerBeat)
            }
            else if (getUrlAll(event, RDF.type).includes(mer('NoteEvent'))) {
                // TODO something is going wrong here, as currentTickTime seems
                // to be 0 permanently.

                const onsetUrl = getUrl(event, mer('has_onset'))
                const offsetUrl = getUrl(event, mer('has_offset'))
                if (!onsetUrl || !offsetUrl) continue

                const onset = getThing(midiDataset, onsetUrl)
                const offset = getThing(midiDataset, offsetUrl)
                if (!onset || !offset) continue

                const onsetTime = getInteger(onset, midi('absoluteTick')) || 0
                const offsetTime = getInteger(offset, midi('absoluteTick')) || 0

                const pitch = getInteger(onset, midi('pitch')) || 0

                const onsetVelocity = getInteger(onset, midi('velocity')) || 0
                const offsetVelocity = getInteger(onset, midi('velocity')) || 0

                allEvents.push({
                    ontime: (currentTickTime || 0.001) * onsetTime,
                    offtime: (currentTickTime || 0.001) * offsetTime,
                    id: asUrl(event),
                    pitch: pitch,
                    sitch: pitchToSitch(pitch),
                    onvel: onsetVelocity,
                    offvel: offsetVelocity,
                    channel: 0,
                    endtime: (currentTickTime || 0.001) * offsetTime,
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
