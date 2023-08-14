import { SolidDataset, createSolidDataset, buildThing, setThing, asUrl, Thing, getInteger, getSourceUrl } from "@inrupt/solid-client"
import { RDF } from "@inrupt/vocab-common-rdf"
import { AnyEvent, MidiFile, NoteOffEvent, NoteOnEvent } from "midifile-ts"
import { v4 } from "uuid"
import { crm, crmdig, midi as mid } from "../../helpers/namespaces"

/**
 * Capitalizes the event type and append 'event' to it
 * @param eventType 
 * @returns string
 */
const normalizeEventType = (eventType: string) => {
    return eventType[0].toUpperCase() + eventType.slice(1) + 'Event'
}

interface MidiLdOptions {
    calculateImprecision: boolean
}

/**
 * This function generates RDF triples from a MIDI file
 * using the MIDI-LD vocabulary.
 * 
 * @returns a `SolidDataset` containing the `Thing`s representing the MIDI file
 */
export const midi2ld = (midi: MidiFile, datasetUrl: string, options: MidiLdOptions): { dataset: SolidDataset, name: string } => {
    let dataset = createSolidDataset()

    const isNoteOn = (event: AnyEvent) => (event as NoteOnEvent).subtype === "noteOn"
    const isNoteOff = (event: AnyEvent) => (event as NoteOffEvent).subtype === "noteOff"

    const pieceName = v4()
    const piece = buildThing({ url: `${datasetUrl}#${pieceName}` })
        .addUrl(RDF.type, mid('Piece'))
        .addInteger(mid('resolution'), midi.header.ticksPerBeat)
        .addInteger(mid('format'), midi.header.formatType)

    for (const midiTrack of midi.tracks) {
        const trackName = v4()
        const track = buildThing({ url: `${datasetUrl}#${trackName}` })
            .addUrl(RDF.type, 'http://purl.org/midi-ld/midi#Track')

        let currentTick = 0
        const noteEvents: Thing[] = []
        for (const midiEvent of midiTrack) {
            currentTick += midiEvent.deltaTime

            const eventName = v4()
            const event = buildThing({ url: `${datasetUrl}#${eventName}` })

            if (isNoteOn(midiEvent)) {
                noteEvents.push(
                    event
                        .addUrl(RDF.type, crm('E5_Event'))
                        .addUrl(RDF.type, crmdig('D35_Area'))
                        .addUrl(RDF.type, crm('E52_Time_Span')) // TODO: use has time-span
                        .addUrl(crm('P2_has_type'), mid('NoteEvent'))
                        .addInteger(crm('P82a_begin_of_the_begin'), currentTick - (options.calculateImprecision ? 10 : 0))
                        .addInteger(crm('P81a_end_of_the_begin'), currentTick + (options.calculateImprecision ? 10 : 0))
                        .addInteger(mid('pitch'), (midiEvent as NoteOnEvent).noteNumber)
                        .addInteger(mid('velocity'), (midiEvent as NoteOnEvent).velocity)
                        .build()
                )
                continue
            }

            else if (isNoteOff(midiEvent)) {
                const noteEvent = noteEvents
                    .slice()
                    .reverse()
                    .find(event =>
                        getInteger(event, mid('pitch')) === (midiEvent as NoteOffEvent).noteNumber)
                if (!noteEvent) {
                    console.log('no corresponding note on event found for', midiEvent)
                    continue
                }

                const finalizedEvent = buildThing(noteEvent)
                    .addInteger(crm('P81b_begin_of_the_end'), currentTick - (options.calculateImprecision ? 10 : 0))
                    .addInteger(crm('P82b_end_of_the_end'), currentTick + (options.calculateImprecision ? 10 : 0))

                dataset = setThing(dataset, finalizedEvent.build())
                track.addUrl(mid('hasEvent'), asUrl(finalizedEvent.build(), datasetUrl))
                continue
            }

            // eslint-disable-next-line no-loop-func
            Object.entries(midiEvent).forEach(([originalProperty, value]) => {
                let property = originalProperty

                // adjust to different naming conventions
                if (property === 'type' || property === 'subtype') {
                    event.addUrl(RDF.type, mid(normalizeEventType(value)))
                }
                else if (property === 'noteNumber') property = 'pitch'
                else if (property === 'deltaTime') {
                    property = 'absoluteTick'

                    // store the absolute time instead of the delta time
                    value = currentTick
                }

                if (typeof value === 'number') {
                    event.addInteger(mid(property), value)
                }
                else {
                    event.addStringNoLocale(mid(property), value)
                }
            })

            event.addUrl(RDF.type, crmdig('D35_Area'))
            dataset = setThing(dataset, event.build())
            track.addUrl(mid('hasEvent'), asUrl(event.build(), datasetUrl))
        }
        dataset = setThing(dataset, track.build())
        piece.addUrl(mid('hasTrack'), asUrl(track.build(), datasetUrl))
    }
    dataset = setThing(dataset, piece.build())

    return {
        dataset,
        name: pieceName
    }
}
