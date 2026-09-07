import { describe, expect, it } from 'vitest'
import { rollGeometry } from './rollGeometry'
import { track, welteT100 } from 'linked-rolls'

const lanes = { note: 4, expression: 7 }
const spacing = 40
const geometry = rollGeometry(lanes, spacing)

const allTracks = Array.from({ length: welteT100.trackCount }, (_, i) => track(i + 1))

describe('roll geometry', () => {
    it('fills the drawing with the bar and two gaps', () => {
        expect(geometry.height).toEqual(20 * lanes.expression + 80 * lanes.note + 2 * spacing)
        expect(geometry.trackToY(track(welteT100.trackCount))).toEqual(0)
        expect(geometry.trackToY(track(1)) + geometry.laneHeight(track(1))).toEqual(geometry.height)
    })

    it('gives every track on the bar a lane', () => {
        expect(allTracks.filter(position => geometry.roleOf(position) === undefined)).toEqual([])
    })

    it('stacks the lanes without overlap, treble at the top', () => {
        const notes = allTracks.filter(position => geometry.roleOf(position) === 'note')
        notes.forEach(position => {
            if (position === Math.max(...notes)) return
            const above = track(position + 1)
            expect(geometry.trackToY(above) + geometry.laneHeight(above))
                .toBeCloseTo(geometry.trackToY(position), 9)
        })
    })

    /**
     * The bug this guards against: features are drawn downwards from
     * `trackToY`, so picking has to read the band below the line, not
     * above it. Getting that backwards puts every click one track off.
     */
    it('picks the track a feature is drawn in', () => {
        allTracks.forEach(position => {
            const middle = geometry.trackToY(position) + geometry.laneHeight(position) / 2
            expect(geometry.yToTrack(middle)).toEqual(position)
        })
    })

    it('picks the top of a lane, not the lane above it', () => {
        allTracks.forEach(position => {
            expect(geometry.yToTrack(geometry.trackToY(position))).toEqual(position)
        })
    })

    it('reports the gaps between the blocks', () => {
        // above the highest note, below the lowest treble valve
        expect(geometry.yToTrack(geometry.trackToY(track(90)) - spacing / 2)).toEqual('gap')
        // below the lowest note, above the highest bass valve
        expect(geometry.yToTrack(geometry.trackToY(track(11)) + lanes.note + spacing / 2)).toEqual('gap')
        expect(geometry.yToTrack(-1)).toEqual('gap')
        expect(geometry.yToTrack(geometry.height + 1)).toEqual('gap')
    })

    it('spans a band across a run of tracks', () => {
        const band = geometry.bandOf({ from: track(11), to: track(13) })
        expect(band.y).toEqual(geometry.trackToY(track(13)))
        expect(band.height).toEqual(3 * lanes.note)
    })

    it('spans the same band whichever way round the run is given', () => {
        expect(geometry.bandOf({ from: track(13), to: track(11) })).toEqual(geometry.bandOf({ from: track(11), to: track(13) }))
    })

    it('gives a single track the height of its own lane', () => {
        expect(geometry.bandOf({ from: track(40) }).height).toEqual(lanes.note)
        expect(geometry.bandOf({ from: track(95) }).height).toEqual(lanes.expression)
    })

    it('bands a whole block of the bar', () => {
        const notes = welteT100.areas.find(area => area.role === 'note')!
        const band = geometry.areaBand(notes)
        expect(band.y).toEqual(geometry.trackToY(track(90)))
        expect(band.height).toEqual(80 * lanes.note)
    })
})
