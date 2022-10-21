import { AlignedPerformance } from "../AlignedPerformance";
import { RawPerformance } from "../Performance";
import { Visitor } from "./Visitor";

export class JsonLdVisitor implements Visitor {
    private contextes: any
    private graph: Array<any>
    private carriedOutBy: string

    constructor() {
        this.contextes = {}
        this.graph = []
        this.carriedOutBy = ''
    }

    public serialize(): string {
        const result = {
            '@context': this.contextes,
            '@graph': this.graph
        }

        return JSON.stringify(result)
    }

    public setCarriedOutBy(carriedOutBy: string) {
        this.carriedOutBy = carriedOutBy
    }

    /**
    * This function generates RDF triples from the Alignment
    * data. 
    * 
    * @todo should it also include the exports of Score and RawPerformance?
    * @returns string of RDF triples in JSON-LD format.
    */
    visitAlignment(alignment: AlignedPerformance) {
        if (!alignment.semanticPairs.length) return

        // defining namespaces
        this.contextes['la'] = 'http://example.org/linked_alignment#'
        this.contextes['crm'] = 'http://www.cidoc-crm.org/cidoc-crm/'
        this.contextes['xsd'] = 'http://www.w3.org/2001/XMLSchema#'

        this.graph = [
            ...this.graph,
            {
                "@id": alignment.uri,
                "@type": "la:Alignment",
                "crm:P14_carried_out_by": {
                    "@id": `http://example_org/${this.carriedOutBy}`,
                    "@type": "E39_Actor"
                },
                "dcterms:created": new Date(Date.now()).toISOString(),
                "la:hasAlignmentPair": alignment.semanticPairs.map((pair, i) => `${alignment.uri}/pair_${i}`)
            },
            ...alignment.semanticPairs.map((pair, i) => {
                const result: any = {
                    "@id": `${alignment.uri}/pair_${i}`,
                    "@type": "la:AlignmentPair",
                    "la:hasMotivation": `http://measuring-early-records.org/alignment-motivation#${pair.motivation}`
                }
                if (pair.scoreNote) {
                    result["la:hasScoreNote"] = `http://measuring-early-records.org/score/score.mei#${pair.scoreNote.id}`
                }
                if (pair.midiNote) {
                    result["la:hasMIDINote"] = `${alignment.rawPerformance?.uri}/track_0/event_${pair.midiNote.id}`
                }

                return result
            })
        ]
    }

    /**
     * This function generates RDF triples using the 
     * MIDI-LD vocabulary.
     * 
     * @returns string of RDF triples in JSON-LD format.
     */
    visitPerformance(performance: RawPerformance) {
        if (!performance.midi) return ''

        this.contextes['mid'] = 'http://example.org/midi#'
        this.contextes['xsd'] = 'http://www.w3.org/2001/XMLSchema#'

        this.graph = [
            ...this.graph,
            {
                "@id": performance.uri,
                "@type": "mid:Pattern",
                "mid:hasTrack": performance.midi.tracks.map((track, i) => `${performance.uri}/track_${i}`)
            },
            ...performance.midi.tracks.map((track, i) => ({
                "@id": `${performance.uri}/track_${i}`,
                "@type": "mid:Track",
                "mid:hasEvent": [track.map((event, j) => `${performance.uri}/track_${i}/event_${j}`)]
            })),

            ...performance.midi.tracks.map((track, i) => {
                // TODO: determine event type and add properties accordingly

                return track.map((event, j) => {
                    return {
                        "@id": `${performance.uri}/track_${i}/event_${j}`,
                        "@type": `mid:${event?.type}`
                    }
                })
            }).flat()
        ]
    }
}
