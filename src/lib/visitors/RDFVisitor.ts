import { buildThing, createSolidDataset, createThing, setThing, SolidDataset } from "@inrupt/solid-client";
import { RDF } from "@inrupt/vocab-common-rdf";
import { AlignedPerformance } from "../AlignedPerformance";
import { RawPerformance } from "../midi/RawPerformance";
import { Visitor } from "./Visitor";

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
        const dataset = createSolidDataset()
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
                    .addUrl(RDF.type, `http://purl.org/midi-ld/midi#${midiEvent.type}`)
                    .build()
                track.addUrl('http://purl.org/midi-ld/midi#hasEvent', event.url)
            }
            piece.addUrl('http://purl.org/midi-ld/midi#hasTrack', track.build().url)
        }

        const modifiedDataset = setThing(dataset, piece.build())
        console.log('modified dataset=', modifiedDataset)

        this._datasets.push(modifiedDataset)

        return dataset
    }
}
