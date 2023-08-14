import { SolidDataset, Thing, buildThing, createThing, getInteger, getPropertyAll, getStringNoLocale, getThing, getUrl, getUrlAll } from "@inrupt/solid-client"
import { AnyEvent, MidiFile, MidiHeader } from "midifile-ts"
import { crm, mer, midi } from "../../helpers/namespaces"
import { RDF } from "@inrupt/vocab-common-rdf"

/**
 * De-capitalizes the event type and removes the 'Event' part
 * 
 * @param eventType 
 * @returns string
 */
const normalizeEventType = (eventType: string) => {
    return (eventType[0].toLowerCase() + eventType.slice(1)).replace('Event', '')
}

/**
 * This function converts a MIDI-LD representation
 * back into proper MIDI.
 * 
 * @returns a `SolidDataset` containing the `Thing`s representing the MIDI file
 */
export const ld2midi = (piece: Thing, midiDataset: SolidDataset): MidiFile | null => {
    const tracks: AnyEvent[][] = []

    const trackUrls = getUrlAll(piece, midi('hasTrack'))
    for (const trackUrl of trackUrls) {
        const trackThing = getThing(midiDataset, trackUrl)
        if (!trackThing) continue

        const eventUrls = getUrlAll(trackThing, midi('hasEvent'))

        const events: AnyEvent[] = eventUrls
            .reduce((acc, url) => {
                const event = getThing(midiDataset, url)
                if (event) acc.push(event)
                return acc
            }, [] as Thing[])
            .sort((a, b) => {
                // make sure that events are in the right order by sorting by tick
                const tickA = getInteger(a, midi('absoluteTick')) || 0
                const tickB = getInteger(b, midi('absoluteTick')) || 0
                return tickA - tickB
            })
            .map((eventThing, index, array) => {
                const tick = getInteger(eventThing, midi('absoluteTick')) || 0
                const prevTick = index > 0 ? getInteger(array[index - 1], midi('absoluteTick')) || 0 : 0

                const event: any = {
                    deltaTime: tick - prevTick
                }

                const properties = getPropertyAll(eventThing)
                for (const property of properties) {
                    if (property === midi('type') || property === midi('subtype')) continue
                    if (property === RDF.type) {
                        const types = getUrlAll(eventThing, property)
                        for (const type of types) {
                            const typeName = normalizeEventType(type.split('#').at(-1) || '')

                            if (['channel', 'meta'].includes(typeName)) {
                                event['type'] = typeName
                            }

                            if (['noteOn', 'noteOff', 'controller', 'timeSignature', 'keySignature', 'endOfTrack', 'setTempo', 'programChange', 'trackName'].includes(typeName)) {
                                event['subtype'] = typeName
                            }
                        }
                        continue
                    }

                    let name = property.split('#').at(-1) || '#'

                    // special case 'tick': this has been treated
                    // already by replacing it with delta time.
                    if (name === 'absoluteTick') continue

                    // treat different naming conventions between 
                    // MIDI-LD and midifile-ts.
                    if (name === 'pitch') name = 'noteNumber'

                    if (name === 'text') {
                        event[name] = getStringNoLocale(eventThing, property)
                    }
                    else {
                        event[name] = getInteger(eventThing, property)
                    }
                }

                return event as AnyEvent
            })

        tracks.push(events)
    }

    const header: MidiHeader = {
        formatType: getInteger(piece, midi('format')) || 1,
        trackCount: tracks.length,
        ticksPerBeat: getInteger(piece, midi('resolution')) || 480
    }

    return {
        header, tracks
    }
}
