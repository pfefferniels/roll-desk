import { midi2ld } from '../src/lib/midi/midi2ld'
import { ld2midi } from '../src/lib/midi/ld2midi'
import { read } from 'midifile-ts'
import fs from 'fs'
import { getThing, getThingAll, getUrlAll, thingAsMarkdown } from '@inrupt/solid-client'
import { deepStrictEqual } from 'assert'
import { RDF } from '@inrupt/vocab-common-rdf'
import { midi as mid } from '../src/helpers/namespaces'

describe('midi2ld conversion and back', () => {
    const data = fs.readFileSync('tests/files/arpeggiation/neutral.mid')

    it('converts MIDI to MIDI-LD and back', () => {
        const arr = Uint8Array.from(data);
        const midi = read(arr);
        const ld = midi2ld(midi, 'http://test.org', {
            calculateImprecision: false
        })
        //console.log('midi=', midi)
        const piece = getThingAll(ld.dataset).find(thing => getUrlAll(thing, RDF.type).includes(mid('Piece')))
        expect(piece).toBeTruthy()

        const midi2 = ld2midi(piece!, ld.dataset)
        expect(midi2?.tracks).toHaveLength(midi.tracks.length)
        expect(midi2?.tracks[0]).toHaveLength(midi.tracks[0].length)
    })
})
