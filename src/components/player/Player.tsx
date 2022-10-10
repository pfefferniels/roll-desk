import { SynthEvent, getSamplesFromSoundFont } from "@ryohey/wavelet"
import { MidiFile } from "midifile-ts"
import { useEffect, useState } from "react"
import { MIDIPlayer } from "../../lib/midi-player"

interface PlayerProps {
    midi: MidiFile
    onProgress: (progress: number) => void
}

export const Player: React.FC<PlayerProps> = ({ midi, onProgress }): JSX.Element => {
    const [setupFinished, setSetupFinished] = useState(false)
    const [error, setError] = useState<Error>()

    const [context] = useState(new AudioContext())
    const [synth, setSynth] = useState<AudioWorkletNode>()

    const [midiPlayer, setMidiPlayer] = useState<MIDIPlayer>()

    const setup = async () => {
        try {
            await context.audioWorklet.addModule("js/processor.js")
        } catch (e) {
            console.error("Failed to add AudioWorklet module", e)
            setError(e as Error)
        }

        const newSynth = new AudioWorkletNode(context, "synth-processor", {
            numberOfInputs: 0,
            outputChannelCount: [2],
        })
        newSynth.connect(context.destination)
        setSynth(newSynth)
    }

    const postSynthMessage = (e: SynthEvent, transfer?: Transferable[]) => {
        if (!synth) return

        synth.port.postMessage(e, transfer ?? [])
    }

    const loadSoundFont = async (soundFontUrl: string) => {
        const soundFontData = await (await fetch(soundFontUrl)).arrayBuffer()
        const parsed = getSamplesFromSoundFont(
            new Uint8Array(soundFontData),
            context
        )

        for (const sample of parsed) {
            postSynthMessage(
                sample,
                [sample.sample.buffer] // transfer instead of copy
            )
        }
    }

    const resetMidiPlayer = (midi: MidiFile) => {
        midiPlayer?.pause()
        const newMidiPlayer = new MIDIPlayer(midi, context.sampleRate, postSynthMessage)
        newMidiPlayer.onProgress = onProgress
        setMidiPlayer(newMidiPlayer)
    }

    useEffect(() => {
        setup()
    }, [])

    useEffect(() => {
        if (!synth) return
        loadSoundFont('soundfonts/A320U.sf2')
            .then(() =>
                setSetupFinished(true)
            )

    }, [synth])

    useEffect(() => {
        if (!setupFinished) return

        resetMidiPlayer(midi)
    }, [setupFinished, midi])

    return (
        <div>
            {setupFinished ? (
                <div>
                    <button
                        id='play'
                        onClick={() => {
                            context.resume()
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

