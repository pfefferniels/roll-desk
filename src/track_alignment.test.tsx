// Test to validate track alignment behavior
import { describe, it, expect } from 'vitest'

// Mock the usePinchZoom hook functionality to test track calculations
const createTrackToY = (noteHeight: number, expressionHeight: number, spacing: number = 40) => {
    const areas = {
        'bass-expression': [0, 9],
        'notes': [10, 89],
        'treble-expression': [90, 99]
    }

    const areaOf = (track: number) => {
        const area = Object
            .entries(areas)
            .find(([_, range]) => track >= range[0] && track <= range[1])
        if (!area) {
            return null
        }
        return area[0]
    }

    const height = 20 * expressionHeight + 80 * noteHeight + 2 * spacing

    const trackToY = (track: number) => {
        const name = areaOf(track)
        if (name === null) return 0

        if (name === 'bass-expression') {
            return height - (track * expressionHeight)
        }
        if (name === 'notes') {
            const noteArea = track - 10
            return height - (spacing + 10 * expressionHeight + noteArea * noteHeight)
        }
        if (name === 'treble-expression') {
            const expressionArea = track - 90
            return height - (spacing * 2 + 10 * expressionHeight + 80 * noteHeight + expressionArea * expressionHeight)
        }
        else {
            return 0
        }
    }

    return { trackToY, height, areaOf }
}

describe('Track Alignment Tests', () => {
    const noteHeight = 10
    const expressionHeight = 5
    const spacing = 40
    
    const { trackToY, height, areaOf } = createTrackToY(noteHeight, expressionHeight, spacing)

    it('should correctly identify track areas for Welte T-100', () => {
        // Bass expression tracks (0-9)
        expect(areaOf(0)).toBe('bass-expression')
        expect(areaOf(9)).toBe('bass-expression')
        
        // Note tracks (10-89)
        expect(areaOf(10)).toBe('notes')
        expect(areaOf(33)).toBe('notes') // This is where Dynamics.tsx is looking for bass!
        expect(areaOf(89)).toBe('notes')
        
        // Treble expression tracks (90-99)
        expect(areaOf(90)).toBe('treble-expression')
        expect(areaOf(97)).toBe('treble-expression')
        expect(areaOf(99)).toBe('treble-expression')
    })

    it('should have correct Y positioning for bass expression tracks', () => {
        // Track 0 should be at the bottom of bass expression area
        const track0Y = trackToY(0)
        const track9Y = trackToY(9)
        
        // Track 9 should be higher (smaller Y) than track 0
        expect(track9Y).toBeLessThan(track0Y)
        
        // The difference should be 9 * expressionHeight
        expect(track0Y - track9Y).toBe(9 * expressionHeight)
    })

    it('should have correct Y positioning for treble expression tracks', () => {
        const track90Y = trackToY(90)
        const track99Y = trackToY(99)
        
        // Track 99 should be higher (smaller Y) than track 90
        expect(track99Y).toBeLessThan(track90Y)
        
        // The difference should be 9 * expressionHeight
        expect(track90Y - track99Y).toBe(9 * expressionHeight)
    })

    it('should show that track 33 is in wrong area for bass dynamics', () => {
        // Track 33 is currently used for bass in Dynamics.tsx
        expect(areaOf(33)).toBe('notes') // This proves it's in the wrong area!
        
        // For bass dynamics, we should be using a bass expression track
        expect(areaOf(4)).toBe('bass-expression') // A better choice for bass
    })

    it('should verify note track positioning', () => {
        const track10Y = trackToY(10) // First note track
        const track11Y = trackToY(11) // Second note track
        
        // Track 11 should be higher (smaller Y) than track 10
        expect(track11Y).toBeLessThan(track10Y)
        
        // The difference should be noteHeight
        expect(track10Y - track11Y).toBe(noteHeight)
    })

    it('should validate fixed track usage for dynamics', () => {
        // Test the corrected track selections for Dynamics component
        // Track 4 should be in bass expression area (better for bass dynamics)
        expect(areaOf(4)).toBe('bass-expression')
        
        // Track 94 should be in treble expression area (better for treble dynamics)
        expect(areaOf(94)).toBe('treble-expression')
        
        // Verify these are better positioned than the original tracks 33 and 97
        const track4Y = trackToY(4)
        const track33Y = trackToY(33)
        const track94Y = trackToY(94)
        
        // Track 4 should be in the bass expression area at the bottom of the roll
        expect(track4Y).toBeGreaterThan(track33Y) // Bass track should be lower than note track
        
        // Track 94 should be in the treble expression area at the top of the roll  
        expect(track94Y).toBeLessThan(track33Y) // Treble track should be higher than note track
    })

    it('should check for off-by-one errors in coordinate calculations', () => {
        // Test boundary conditions
        
        // Bass expression area (tracks 0-9)
        const track0Y = trackToY(0)
        const track1Y = trackToY(1)
        expect(track0Y - track1Y).toBe(expressionHeight)
        
        // Note area (tracks 10-89)
        const track10Y = trackToY(10) // First note track
        const track11Y = trackToY(11) // Second note track
        expect(track10Y - track11Y).toBe(noteHeight)
        
        // Treble expression area (tracks 90-99)
        const track90Y = trackToY(90) // First treble track
        const track91Y = trackToY(91) // Second treble track
        expect(track90Y - track91Y).toBe(expressionHeight)
        
        // Verify spacing between areas
        const track9Y = trackToY(9)  // Last bass expression
        const track10YAgain = trackToY(10) // First note
        
        // There should be a spacing gap between bass expression and notes
        const expectedSpacingBetweenBassAndNotes = spacing
        const actualSpacingBetweenBassAndNotes = track9Y - track10YAgain - expressionHeight
        expect(actualSpacingBetweenBassAndNotes).toBe(expectedSpacingBetweenBassAndNotes)
    })

    it('should verify yToTrack inverse function works correctly', () => {
        const createYToTrack = (noteHeight: number, expressionHeight: number, spacing: number = 40) => {
            const height = 20 * expressionHeight + 80 * noteHeight + 2 * spacing
            
            const yToTrack = (y: number): number | 'gap' => {
                const inverse = height - y
        
                const seg1Max = 10 * expressionHeight
                const seg2Min = spacing + 10 * expressionHeight
                const seg2Max = spacing + 10 * expressionHeight + 80 * noteHeight
                const seg3Min = spacing * 2 + 10 * expressionHeight + 80 * noteHeight
        
                if (inverse < seg1Max) {
                    return Math.floor(inverse / expressionHeight)
                }
                else if (inverse >= seg2Min && inverse < seg2Max) {
                    return Math.floor((inverse - seg2Min) / noteHeight) + 10
                }
                else if (inverse >= seg3Min) {
                    return Math.floor((inverse - seg3Min) / expressionHeight) + 90
                }
        
                return 'gap'
            }
            
            return yToTrack
        }
        
        const yToTrack = createYToTrack(noteHeight, expressionHeight, spacing)
        
        // Test that trackToY and yToTrack are inverse functions
        // Bass expression tracks
        for (let track = 0; track <= 9; track++) {
            const y = trackToY(track)
            const backToTrack = yToTrack(y)
            expect(backToTrack).toBe(track)
        }
        
        // Note tracks
        for (let track = 10; track <= 89; track += 10) { // Sample every 10th track
            const y = trackToY(track)
            const backToTrack = yToTrack(y)
            expect(backToTrack).toBe(track)
        }
        
        // Treble expression tracks
        for (let track = 90; track <= 99; track++) {
            const y = trackToY(track)
            const backToTrack = yToTrack(y)
            expect(backToTrack).toBe(track)
        }
    })

    it('should support flexible roll systems with getRepresentativeTrack', () => {
        // Test the getRepresentativeTrack function
        const getRepresentativeTrack = (area: 'bass-expression' | 'notes' | 'treble-expression'): number => {
            const areas = {
                'bass-expression': [0, 9],
                'notes': [10, 89],
                'treble-expression': [90, 99]
            }
            const range = areas[area]
            return Math.floor((range[0] + range[1]) / 2)
        }

        // For Welte T-100 system
        expect(getRepresentativeTrack('bass-expression')).toBe(4) // (0 + 9) / 2 = 4.5 -> 4
        expect(getRepresentativeTrack('notes')).toBe(49) // (10 + 89) / 2 = 49.5 -> 49  
        expect(getRepresentativeTrack('treble-expression')).toBe(94) // (90 + 99) / 2 = 94.5 -> 94

        // Verify these tracks are in the correct areas
        expect(areaOf(getRepresentativeTrack('bass-expression'))).toBe('bass-expression')
        expect(areaOf(getRepresentativeTrack('notes'))).toBe('notes')
        expect(areaOf(getRepresentativeTrack('treble-expression'))).toBe('treble-expression')
        
        // Test with a different roll system (e.g., a hypothetical system with different ranges)
        const getRepresentativeTrackCustom = (area: 'bass-expression' | 'notes' | 'treble-expression'): number => {
            const customAreas = {
                'bass-expression': [0, 4],     // Only 5 bass tracks
                'notes': [5, 84],              // 80 note tracks  
                'treble-expression': [85, 99]  // 15 treble tracks
            }
            const range = customAreas[area]
            return Math.floor((range[0] + range[1]) / 2)
        }

        expect(getRepresentativeTrackCustom('bass-expression')).toBe(2) // (0 + 4) / 2 = 2
        expect(getRepresentativeTrackCustom('notes')).toBe(44) // (5 + 84) / 2 = 44.5 -> 44
        expect(getRepresentativeTrackCustom('treble-expression')).toBe(92) // (85 + 99) / 2 = 92
    })
})