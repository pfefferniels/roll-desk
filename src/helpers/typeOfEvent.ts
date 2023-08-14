import { Thing, getInteger, getUrlAll } from "@inrupt/solid-client";
import { RDF } from "@inrupt/vocab-common-rdf";
import { mer, midi } from "./namespaces";

export const typeOf = (midiEvent: Thing) => {
    if (getUrlAll(midiEvent, RDF.type).includes(mer('NoteEvent'))) {
        return 'note'
    }
    else if (getUrlAll(midiEvent, RDF.type).includes(midi('ControllerEvent')) &&
        getInteger(midiEvent, midi('controllerType')) === 64) {
        return 'pedal'
    }
    else if (getUrlAll(midiEvent, RDF.type).includes(midi('NoteOnEvent'))) {
        return 'noteOn'
    }
    else if (getUrlAll(midiEvent, RDF.type).includes(midi('NoteOffEvent'))) {
        return 'noteOff'
    }
}
