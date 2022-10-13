import { SynthEvent, getSamplesFromSoundFont } from "@ryohey/wavelet"
import { useEffect, useState, createContext } from "react"

interface MidiOutputState {
    postSynthMessage?: (e: SynthEvent, transfer?: Transferable[]) => void
    error?: Error 
    setupFinished: boolean 
    audioContext: AudioContext
}

//set an empty object as default state
export const MidiOutputContext = createContext({} as MidiOutputState);

interface MidiOutputProviderProps {
    children: React.ReactNode
}

export const MidiOutputProvider: React.FC<MidiOutputProviderProps> = ({ children }) => {
    const [setupFinished, setSetupFinished] = useState(false)
    const [error, setError] = useState<Error>()

    const [context] = useState(new AudioContext())
    const [synth, setSynth] = useState<AudioWorkletNode>()

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
        if (!synth) {
            console.log('Audio worklet node not yet ready, cannot post synth message.')
            return
        }

        console.log('pstSynthMessage', e)
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

    useEffect(() => {
        setup()
    }, [])

    useEffect(() => {
        if (!synth) return
        loadSoundFont('soundfonts/A320U.sf2')
            .then(() => {
                context.resume()
                setSetupFinished(true)
            })
    }, [synth])

    return (
        <MidiOutputContext.Provider value={{
            postSynthMessage: postSynthMessage,
            setupFinished,
            audioContext: context,
            error
        }}>
            {children}
        </MidiOutputContext.Provider>
    )
}
