import { buildThing, createSolidDataset, createThing, setThing, SolidDataset } from "@inrupt/solid-client";
import { RDF } from "@inrupt/vocab-common-rdf";
import { AlignedPerformance } from "../AlignedPerformance";
import { RawPerformance } from "../midi/RawPerformance";
import { Visitor } from "./Visitor";

/**
 * Capitalizes the event type and append 'event' to it
 * @param eventType 
 * @returns string
 */
const normalizeEventType = (eventType: string) => {
    return eventType[0].toUpperCase() + eventType.slice(1) + 'Event'
}

export class RdfVisitor implements Visitor {
    private _datasets: SolidDataset[]

    constructor() {
        this._datasets = []
    }

    public get datasets() {
        return this._datasets
    }

    /**
    * This function generates RDF triples from the Alignment
    * data. 
    * 
    * @returns a `SolidDataset` containing the `Thing`s representing the alignment
    */
    visitAlignment(alignment: AlignedPerformance) {
        if (!alignment.semanticPairs.length) return ''

        return ''
        // TODO
    }

    /**
     * This function generates RDF triples using the 
     * MIDI-LD vocabulary.
     * 
     * @returns a `SolidDataset` containing the `Thing`s representing the MIDI file
     */
    visitPerformance(performance: RawPerformance): SolidDataset {
        let dataset = createSolidDataset()
        const midi = performance.midi
        if (!midi) return dataset

        const piece = buildThing(createThing())
            .addUrl(RDF.type, 'http://purl.org/midi-ld/midi#Piece')
            .addInteger('http://purl.org/midi-ld/midi#resolution', midi.header.ticksPerBeat)
            .addInteger('http://purl.org/midi-ld/midi#format', midi.header.formatType)

        for (const midiTrack of midi.tracks) {
            const track = buildThing(createThing())
                .addUrl(RDF.type, 'http://purl.org/midi-ld/midi#Track')

            for (const midiEvent of midiTrack) {
                const event = buildThing(createThing())
                    .addUrl(RDF.type, `http://purl.org/midi-ld/midi#${normalizeEventType(midiEvent.type)}`)
                    .addInteger('http://purl.org/midi-ld/midi#tick', midiEvent.deltaTime)

                if (midiEvent.type === 'channel') {
                    event
                        .addInteger('http://purl.org/midi-ld/midi#channel', midiEvent.channel)
                        .addUrl(RDF.type, `http://purl.org/midi-ld/midi#${normalizeEventType(midiEvent.subtype)}`)

                    if (midiEvent.subtype === 'noteOn') {
                        event
                            .addInteger('http://purl.org/midi-ld/midi#pitch', midiEvent.noteNumber)
                            .addInteger('http://purl.org/midi-ld/midi#velocity', midiEvent.velocity)
                    }
                }
                dataset = setThing(dataset, event.build())
                track.addUrl('http://purl.org/midi-ld/midi#hasEvent', event.build().url)
            }
            dataset = setThing(dataset, track.build())
            piece.addUrl('http://purl.org/midi-ld/midi#hasTrack', track.build().url)
        }
        dataset = setThing(dataset, piece.build())

        this._datasets.push(dataset)
        return dataset
    }
}
