import { SynthEvent } from '@ryohey/wavelet';
interface MidiOutputState {
    postSynthMessage?: (e: SynthEvent, transfer?: Transferable[]) => void;
    error?: Error;
    setupFinished: boolean;
    audioContext: AudioContext;
}
export declare const MidiOutputContext: import('react').Context<MidiOutputState>;
interface MidiOutputProviderProps {
    children: React.ReactNode;
}
export declare const MidiOutputProvider: React.FC<MidiOutputProviderProps>;
export {};
