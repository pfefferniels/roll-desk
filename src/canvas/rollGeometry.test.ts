import { describe, expect, it } from 'vitest'
import { atLeastVisible, evenGeometry, lanesOf, RollGeometry, rollGeometry } from './rollGeometry'
import { add, scale, subtract, track, TrackerBar, welteLicensee, welteT100, welteT98 } from 'linked-rolls'
import { svg } from './units'

const lanes = lanesOf(svg(4), svg(7))
const spacing = svg(40)
const geometry = rollGeometry(lanes, spacing, welteT100)

const allTracks = Array.from({ length: welteT100.trackCount }, (_, i) => track(i + 1))

describe('roll geometry', () => {
    it('fills the drawing with the bar and two gaps', () => {
        expect(geometry.height).toEqual(20 * lanes['treble-expression'] + 80 * lanes.note + 2 * spacing)
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
            const middle = add(geometry.trackToY(position), scale(geometry.laneHeight(position), 0.5))
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
        expect(geometry.yToTrack(subtract(geometry.trackToY(track(90)), scale(spacing, 0.5)))).toEqual('gap')
        // below the lowest note, above the highest bass valve
        expect(geometry.yToTrack(add(add(geometry.trackToY(track(11)), lanes.note), scale(spacing, 0.5)))).toEqual('gap')
        expect(geometry.yToTrack(svg(-1))).toEqual('gap')
        expect(geometry.yToTrack(add(geometry.height, svg(1)))).toEqual('gap')
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
        expect(geometry.bandOf({ from: track(95) }).height).toEqual(lanes['treble-expression'])
    })

    it('bands a whole block of the bar', () => {
        const notes = welteT100.areas.find(area => area.role === 'note')!
        const band = geometry.areaBand(notes)
        expect(band.y).toEqual(geometry.trackToY(track(90)))
        expect(band.height).toEqual(80 * lanes.note)
    })

    it('lets the expression on either side keep a lane height of its own', () => {
        const uneven = rollGeometry({ ...lanes, 'bass-expression': svg(12) }, spacing, welteT100)
        const [bass, , treble] = welteT100.areas

        expect(uneven.areaBand(bass!).height).toEqual(10 * 12)
        expect(uneven.areaBand(treble!).height).toEqual(10 * lanes['treble-expression'])
        expect(uneven.laneHeight(track(5))).toEqual(12)
        expect(uneven.height).toEqual(geometry.height + 10 * (12 - lanes['bass-expression']))
    })
})

describe('the keyboard cut to a compass', () => {
    const compass = { lowest: 36, highest: 96 }
    const cut = rollGeometry(lanes, spacing, welteT100, compass)

    const keyOf = (bar: TrackerBar, pitch: number) => bar.positionOf({ type: 'note', pitch })!
    const keyboardOf = (geometry: RollGeometry) => geometry.areas.find(area => area.role === 'note')!

    it('reaches from the lowest note played to the highest', () => {
        expect(keyboardOf(cut)).toEqual({ role: 'note', from: keyOf(welteT100, 36), to: keyOf(welteT100, 96) })
        expect(cut.height).toEqual(geometry.height - (80 - 61) * lanes.note)
    })

    it('leaves the expression on either side whole', () => {
        const [bass, , treble] = welteT100.areas
        expect(cut.areaBand(bass!).height).toEqual(geometry.areaBand(bass!).height)
        expect(cut.areaBand(treble!).height).toEqual(geometry.areaBand(treble!).height)
    })

    it('puts the highest note at the top of the keyboard and the lowest at its foot', () => {
        const { y, height } = cut.areaBand(keyboardOf(cut))
        expect(cut.trackToY(keyOf(welteT100, 96))).toEqual(y)
        const lowest = cut.bandOf({ from: keyOf(welteT100, 36) })
        expect(lowest.y + lowest.height).toEqual(y + height)
    })

    it('still picks the track a key is drawn in', () => {
        const middleC = keyOf(welteT100, 60)
        const middle = add(cut.trackToY(middleC), scale(cut.laneHeight(middleC), 0.5))
        expect(cut.yToTrack(middle)).toEqual(middleC)
    })

    /** A green version's deletions are laid out on the red bar, and have to meet its keys. */
    it('cuts two bars numbering their keyboards differently to the same notes', () => {
        const other = rollGeometry(lanes, spacing, welteT98, compass)
        expect(keyOf(welteT98, 96)).not.toEqual(keyOf(welteT100, 96))
        expect(other.areaBand(keyboardOf(other)).height).toEqual(cut.areaBand(keyboardOf(cut)).height)
        expect(other.trackToY(keyOf(welteT98, 96))).toEqual(other.areaBand(keyboardOf(other)).y)
    })

    it('keeps an end the bar has no key for where the bar has it', () => {
        const beyond = rollGeometry(lanes, spacing, welteT100, { lowest: 10, highest: 60 })
        expect(keyboardOf(beyond)).toEqual({ role: 'note', from: track(11), to: keyOf(welteT100, 60) })
    })

    it('lays the whole keyboard out where no compass is given', () => {
        expect(geometry.areas).toEqual(welteT100.areas)
    })
})

describe('the bar in even lanes', () => {
    const even = evenGeometry(svg(200), welteT100)

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
        const licensee = evenGeometry(svg(200), welteLicensee)
        expect(licensee.height).toEqual(200)
        expect(licensee.trackToY(track(welteLicensee.trackCount))).toEqual(0)
        expect(licensee.laneHeight(track(1))).toBeCloseTo(200 / 98, 9)
    })
})

describe('a box drawn too small to see', () => {
    it('is widened to half a pixel each way', () => {
        expect(atLeastVisible({ x: svg(3), y: svg(4), width: svg(0), height: svg(0.2) }))
            .toEqual({ x: 3, y: 4, width: 0.5, height: 0.5 })
    })

    it('leaves a box that is already there alone', () => {
        const box = { x: svg(3), y: svg(4), width: svg(8), height: svg(2) }
        expect(atLeastVisible(box)).toEqual(box)
    })
})
