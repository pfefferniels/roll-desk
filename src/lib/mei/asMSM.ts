import { MEI } from "./MEI"
import { MSM } from "mpmify"

export const asMSM = (mei: MEI) => {
    const msmNotes = mei.allNotes().map(note => ({
        'part': note.part,
        'xml:id': note.id,
        'date': MEI.qstampToTstamp(note.qstamp),
        'duration': MEI.qstampToTstamp(note.duration),
        'pitchname': note.pname!,
        'octave': note.octave!,
        'accidentals': note.accid!,
        'midi.pitch': note.pnum
    } as any))
    return new MSM(msmNotes, mei.timeSignature())
}

