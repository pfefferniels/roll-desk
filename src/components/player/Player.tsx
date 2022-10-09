import { SynthEvent, getSamplesFromSoundFont } from "@ryohey/wavelet"
import { deserialize, MidiFile, Stream } from "midifile-ts"
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
        }
        const newSynth = new AudioWorkletNode(context, "synth-processor", {
            numberOfInputs: 0,
            outputChannelCount: [2],
        } as any)
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

    const setupMIDIInput = async () => {
        if ((navigator as any).requestMIDIAccess === undefined) {
            console.warn('Web MIDI API not supported by your browser')
            setError(new Error('Web MIDI API not supported by your browser'))
            return
        }

        const midiAccess = await (navigator as any).requestMIDIAccess()

        midiAccess.inputs.forEach((entry: any) => {
            entry.onmidimessage = (event: any) => {
                const e = deserialize(new Stream(event.data), 0, () => { })
                if ("channel" in e) {
                    postSynthMessage({ type: "midi", midi: e, delayTime: 0 })
                }
            }
        })
    }

    useEffect(() => {
        Promise.all([
            setup(),
            loadSoundFont('soundfonts/A320U.sf2'),
            setupMIDIInput()
        ]).then(() => {
            resetMidiPlayer(midi)
            setSetupFinished(true)
        }).catch((e) =>
            setError(e))
    }, [])

    useEffect(() => {
        resetMidiPlayer(midi)
    }, [midi])

    const resetMidiPlayer = (midi: MidiFile) => {
        const newMidiPlayer = new MIDIPlayer(midi, context.sampleRate, postSynthMessage)
        newMidiPlayer.onProgress = onProgress
        setMidiPlayer(newMidiPlayer)
        midiPlayer?.pause()
        context.resume()
        newMidiPlayer?.resume()
    }

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

