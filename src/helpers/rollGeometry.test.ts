import { describe, expect, it } from 'vitest'
import { atLeastVisible, evenGeometry, rollGeometry } from './rollGeometry'
import { track, welteLicensee, welteT100 } from 'linked-rolls'

const lanes = { note: 4, expression: 7 }
const spacing = 40
const geometry = rollGeometry(lanes, spacing, welteT100)

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

describe('the bar in even lanes', () => {
    const even = evenGeometry(200, welteT100)

    it('divides the drawing among the tracks and no further', () => {
        expect(even.height).toEqual(200)
        expect(even.laneHeight(track(1))).toEqual(2)
        expect(even.laneHeight(track(welteT100.trackCount))).toEqual(2)
    })

    /**
     * The bug this guards against: a bar laid out as though its tracks were
     * numbered from zero hangs the last of them a lane past the bottom edge.
     */
    it('keeps both ends of the bar inside the drawing', () => {
        expect(even.trackToY(track(welteT100.trackCount))).toEqual(0)
        expect(even.bandOf({ from: track(1) })).toEqual({ y: 198, height: 2 })
    })

    it('gives a run of tracks a lane for each of them', () => {
        expect(even.bandOf({ from: track(11), to: track(13) })).toEqual({ y: 174, height: 6 })
    })

    it('divides the same drawing among the tracks of another bar', () => {
        const licensee = evenGeometry(200, welteLicensee)
        expect(licensee.height).toEqual(200)
        expect(licensee.trackToY(track(welteLicensee.trackCount))).toEqual(0)
        expect(licensee.laneHeight(track(1))).toBeCloseTo(200 / 98, 9)
    })
})

describe('a box drawn too small to see', () => {
    it('is widened to half a pixel each way', () => {
        expect(atLeastVisible({ x: 3, y: 4, width: 0, height: 0.2 }))
            .toEqual({ x: 3, y: 4, width: 0.5, height: 0.5 })
    })

    it('leaves a box that is already there alone', () => {
        const box = { x: 3, y: 4, width: 8, height: 2 }
        expect(atLeastVisible(box)).toEqual(box)
    })
})
