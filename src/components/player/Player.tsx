import { SynthEvent, getSamplesFromSoundFont } from "@ryohey/wavelet"
import { MidiFile } from "midifile-ts"
import { useContext, useEffect, useState } from "react"
import { MIDIPlayer } from "../../lib/midi-player"
import { MidiOutputContext } from "../../providers"

interface PlayerProps {
    midi: MidiFile
    onProgress: (progress: number) => void
}

export const Player: React.FC<PlayerProps> = ({ midi, onProgress }): JSX.Element => {
    const { postSynthMessage, error, audioContext, setupFinished } = useContext(MidiOutputContext)
    const [midiPlayer, setMidiPlayer] = useState<MIDIPlayer>()

    const resetMidiPlayer = (midi: MidiFile) => {
        if (!postSynthMessage) {
            console.log('MIDI setup not completed')
            return
        }

        midiPlayer?.pause()
        const newMidiPlayer = new MIDIPlayer(midi, audioContext.sampleRate, postSynthMessage)
        newMidiPlayer.onProgress = onProgress
        setMidiPlayer(newMidiPlayer)
    }

    useEffect(() => {
        resetMidiPlayer(midi)
    }, [midi])

    return (
        <div>
            {setupFinished ? (
                <div>
                    <button
                        id='play'
                        onClick={() => {
                            audioContext.resume()
                            midiPlayer?.seek(0)
                            midiPlayer?.resume()
                        }}>
                        Play
                    </button>

                    <button
                        id='pause'
                        onClick={() => midiPlayer?.pause()}>
                        Pause
                    </button>
                </div>) :
                <div>
                    MIDI setup not yet finished:
                    {error && error.message}
                </div>
            }
        </div>
    )
}

