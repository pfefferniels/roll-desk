import isNode from "detect-node";
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';

export function uuid() {
    return 'axxxxx'.replace(/[x]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function loadDomParser(): Promise<DOMParser> {
    if (isNode) {
        const jsdom = await import('jsdom')
        const JSDOM = new jsdom.JSDOM(``)
        return new JSDOM.window.DOMParser()
    }
    else {
        return new window.DOMParser()
    }
}

export async function loadVerovio(): Promise<any> {
    if (isNode) {
        const module = await createVerovioModule()
        return new VerovioToolkit(module)
    }
    else {
        return window.vrvToolkit
    }
}
