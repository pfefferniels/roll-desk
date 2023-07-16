import { SolidDataset, Thing, buildThing, createThing, getInteger, getPropertyAll, getStringNoLocale, getThing, getUrl, getUrlAll } from "@inrupt/solid-client"
import { AnyEvent, MidiFile, MidiHeader } from "midifile-ts"
import { crm, midi } from "../../helpers/namespaces"
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
        const transformedEvents = []
        for (const eventUrl of eventUrls) {
            const eventThing = getThing(midiDataset, eventUrl)
            if (!eventThing) continue

            // note events are a special case:
            // split up note events into a note on and note off event
            if (getUrl(eventThing, crm('P2_has_type')) === midi('NoteEvent')) {
                const channel = getInteger(eventThing, midi('channel')) || 0
                const onset = getInteger(eventThing, crm('P82a_begin_of_the_begin')) || 0
                const offset = getInteger(eventThing, crm('P82b_end_of_the_end')) || 0
                const pitch = getInteger(eventThing, midi('pitch')) || 0
                const velocity = getInteger(eventThing, midi('velocity')) || 0

                transformedEvents.push(buildThing(createThing())
                    .addUrl(RDF.type, midi('NoteOnEvent'))
                    .addUrl(RDF.type, midi('ChannelEvent'))
                    .addInteger(midi('channel'), channel)
                    .addInteger(midi('tick'), onset)
                    .addInteger(midi('pitch'), pitch)
                    .addInteger(midi('velocity'), velocity)
                    .build())

                transformedEvents.push(buildThing(createThing())
                    .addUrl(RDF.type, midi('NoteOffEvent'))
                    .addUrl(RDF.type, midi('ChannelEvent'))
                    .addInteger(midi('channel'), channel)
                    .addInteger(midi('tick'), offset)
                    .addInteger(midi('pitch'), pitch)
                    .addInteger(midi('velocity'), 0)
                    .build())
            }
            else {
                // otherwise just append
                transformedEvents.push(eventThing)
            }
        }

        // make sure that events are in the right order by sorting by tick
        transformedEvents.sort((a, b) => {
            const tickA = getInteger(a, midi('tick')) || 0
            const tickB = getInteger(b, midi('tick')) || 0
            return tickA - tickB
        })

        const events: AnyEvent[] = transformedEvents.map((eventThing, index, array) => {
            const tick = getInteger(eventThing, midi('tick')) || 0
            const prevTick = index > 0 ? getInteger(array[index - 1], midi('tick')) || 0 : 0

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
                if (name === 'tick') continue

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
