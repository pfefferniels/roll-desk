import { describe, expect, it } from 'vitest'
import { rollGeometry } from './rollGeometry'
import { welteT100 } from 'linked-rolls'

const lanes = { note: 4, expression: 7 }
const spacing = 40
const geometry = rollGeometry(lanes, spacing)

const allTracks = Array.from({ length: welteT100.trackCount }, (_, i) => i + 1)

describe('roll geometry', () => {
    it('fills the drawing with the bar and two gaps', () => {
        expect(geometry.height).toEqual(20 * lanes.expression + 80 * lanes.note + 2 * spacing)
        expect(geometry.trackToY(welteT100.trackCount)).toEqual(0)
        expect(geometry.trackToY(1) + geometry.laneHeight(1)).toEqual(geometry.height)
    })

    it('gives every track on the bar a lane', () => {
        expect(allTracks.filter(track => geometry.roleOf(track) === undefined)).toEqual([])
    })

    it('stacks the lanes without overlap, treble at the top', () => {
        const notes = allTracks.filter(track => geometry.roleOf(track) === 'note')
        notes.forEach(track => {
            if (track === Math.max(...notes)) return
            expect(geometry.trackToY(track + 1) + geometry.laneHeight(track + 1))
                .toBeCloseTo(geometry.trackToY(track), 9)
        })
    })

    /**
     * The bug this guards against: features are drawn downwards from
     * `trackToY`, so picking has to read the band below the line, not
     * above it. Getting that backwards puts every click one track off.
     */
    it('picks the track a feature is drawn in', () => {
        allTracks.forEach(track => {
            const middle = geometry.trackToY(track) + geometry.laneHeight(track) / 2
            expect(geometry.yToTrack(middle)).toEqual(track)
        })
    })

    it('picks the top of a lane, not the lane above it', () => {
        allTracks.forEach(track => {
            expect(geometry.yToTrack(geometry.trackToY(track))).toEqual(track)
        })
    })

    it('reports the gaps between the blocks', () => {
        // above the highest note, below the lowest treble valve
        expect(geometry.yToTrack(geometry.trackToY(90) - spacing / 2)).toEqual('gap')
        // below the lowest note, above the highest bass valve
        expect(geometry.yToTrack(geometry.trackToY(11) + lanes.note + spacing / 2)).toEqual('gap')
        expect(geometry.yToTrack(-1)).toEqual('gap')
        expect(geometry.yToTrack(geometry.height + 1)).toEqual('gap')
    })

    it('spans a band across a run of tracks', () => {
        const band = geometry.bandOf({ from: 11, to: 13 })
        expect(band.y).toEqual(geometry.trackToY(13))
        expect(band.height).toEqual(3 * lanes.note)
    })

    it('spans the same band whichever way round the run is given', () => {
        expect(geometry.bandOf({ from: 13, to: 11 })).toEqual(geometry.bandOf({ from: 11, to: 13 }))
    })

    it('gives a single track the height of its own lane', () => {
        expect(geometry.bandOf({ from: 40 }).height).toEqual(lanes.note)
        expect(geometry.bandOf({ from: 95 }).height).toEqual(lanes.expression)
    })

    it('bands a whole block of the bar', () => {
        const notes = welteT100.areas.find(area => area.role === 'note')!
        const band = geometry.areaBand(notes)
        expect(band.y).toEqual(geometry.trackToY(90))
        expect(band.height).toEqual(80 * lanes.note)
    })
})
