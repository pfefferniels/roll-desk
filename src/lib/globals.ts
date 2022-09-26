import isNode from "detect-node";
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';

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
