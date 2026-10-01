import { Expression, Note, Track, TrackerBar } from "linked-rolls"
import { Midi } from "tonal"

/** A command's type as words: `SustainPedalOn` reads "Sustain pedal on". */
const wordsOf = (expressionType: string): string => {
    const words = expressionType.split(/(?=[A-Z])/).map(word => word.toLowerCase()).join(' ')
    return words.charAt(0).toUpperCase() + words.slice(1)
}

/** A pitch as a note name, its octave numbered as middle C is C4. */
const noteNameOf = (pitch: number): string =>
    Midi.midiToNoteName(pitch, { sharps: true }).replace('#', '♯')

/**
 * What a command's lane says on the bar it is drawn by: the note it sounds,
 * or what the valve does, where a command the bar holds for as long as it
 * lasts says so. The half is left out, the block the lane lies in showing
 * it already. Nothing where the bar does not read the command at all.
 */
export const laneMeaning = (command: Note | Expression, bar: TrackerBar): { meaning: string, track: Track } | undefined => {
    const track = bar.positionOf(command)
    if (track === undefined) return undefined

    if (command.type === 'note') return { meaning: noteNameOf(command.pitch), track }

    const held = bar.operationOf(command.expressionType)?.spelling === 'held' ? ' (held)' : ''
    return { meaning: `${wordsOf(command.expressionType)}${held}`, track }
}
