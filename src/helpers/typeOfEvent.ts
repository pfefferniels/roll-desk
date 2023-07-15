import { Thing, getInteger, getUrlAll } from "@inrupt/solid-client";
import { RDF } from "@inrupt/vocab-common-rdf";
import { crm, midi } from "./namespaces";

export const typeOf = (midiEvent: Thing) => {
    if (getUrlAll(midiEvent, crm('P2_has_type')).includes(midi('NoteEvent'))) {
        return 'note'
    }
    else if (getUrlAll(midiEvent, RDF.type).includes(midi('ControllerEvent')) &&
        getInteger(midiEvent, midi('controllerType')) === 64) {
        return 'pedal'
    }
}
