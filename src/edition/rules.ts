/**
 * The rules an edition's inferences draw their conclusions by. An
 * inference names them by IRI (`applies`, CRMinf J3 applied), and the
 * page each IRI leads to states them; the edition itself holds no more
 * than the names.
 */

import { AnyArgumentation, Edition } from "linked-rolls"
import { useEffect, useState } from "react"

/** A rule as the page that publishes it states it. */
export interface RuleText {
    name?: string
    text?: string
    /** Where the page states it among its rules, counted from 0. */
    order?: number
}

/** A rule an inference applies: its IRI, and what its page says of it where the page could be read. */
export interface Rule extends RuleText {
    iri: string
}

/** The IRI an id names, read against the edition's address, or nothing where it names none. */
const iriOf = (id: string, base: string): string | undefined => {
    const url = URL.canParse(id, base || undefined) ? new URL(id, base || undefined) : undefined
    return url && (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : undefined
}

/** The rules a reason applies, by IRI. Only an inference applies any. */
export const appliedBy = (reason: AnyArgumentation, base: string): string[] => {
    if (reason.type !== 'inference') return []
    return (reason.applies ?? []).flatMap(id => iriOf(id, base) ?? [])
}

/** Every rule the edition's inferences apply, by IRI, in the order they are first named. */
export const rulesOf = (edition: Edition): string[] => {
    const found = new Set<string>()
    const seen = new WeakSet<object>()
    const walk = (node: unknown) => {
        if (!node || typeof node !== 'object' || seen.has(node)) return
        seen.add(node)
        if (Array.isArray(node)) return node.forEach(walk)
        const record = node as Record<string, unknown>
        if (record.type === 'inference') appliedBy(record as unknown as AnyArgumentation, edition.base).forEach(iri => found.add(iri))
        Object.values(record).forEach(walk)
    }
    walk(edition)
    return [...found]
}

const LABEL = ['rdfs:label', 'http://www.w3.org/2000/01/rdf-schema#label']
const CONTENT = ['crm:P190_has_symbolic_content', 'http://www.cidoc-crm.org/cidoc-crm/P190_has_symbolic_content']

type JsonObject = Record<string, unknown>

const isObject = (value: unknown): value is JsonObject =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

/** The IRI a context maps a term to. */
const definitionOf = (definition: unknown): unknown =>
    isObject(definition) ? definition['@id'] : definition

/** The keys under which a node states what one of the IRIs means: the IRIs themselves and the terms the context maps to them. */
const keysFor = (context: JsonObject, iris: readonly string[]): string[] => [
    ...iris,
    ...Object.entries(context)
        .filter(([, definition]) => iris.some(iri => iri === definitionOf(definition)))
        .map(([term]) => term)
]

interface Literal {
    value: string
    language?: string
}

/** The literals a value states as JSON-LD may write them: plain, as value objects, as a language map, or several. */
const literalsOf = (value: unknown): Literal[] => {
    if (typeof value === 'string') return [{ value }]
    if (Array.isArray(value)) return value.flatMap(literalsOf)
    if (!isObject(value)) return []
    if ('@value' in value) {
        const { '@value': inner, '@language': language } = value
        return typeof inner === 'string' ? [{ value: inner, language: typeof language === 'string' ? language : undefined }] : []
    }
    // A language map: what stands under each language is in it.
    return Object.entries(value)
        .filter(([key]) => !key.startsWith('@'))
        .flatMap(([language, inner]) => literalsOf(inner).map(literal => ({ ...literal, language })))
}

/** A language tag without its region, script or variant, for comparing. */
const primary = (tag: string): string => tag.split('-')[0]?.toLowerCase() ?? ''

/** The literal in the first of the languages asked for that it is stated in, or else the first it states. */
const literal = (value: unknown, languages: readonly string[]): string | undefined => {
    const all = literalsOf(value)
    const preferred = languages
        .map(language => all.find(literal => literal.language !== undefined && primary(literal.language) === primary(language)))
        .find(literal => literal !== undefined)
    return (preferred ?? all[0])?.value
}

/** The languages the reader reads, in the order they prefer them, and then English, the desk's own. */
const readersLanguages = (): string[] =>
    [...(typeof navigator === 'undefined' ? [] : navigator.languages ?? []), 'en']

/**
 * The rules one JSON-LD document states, each node's label as its name and
 * its symbolic content (crm:P190) as its text, each in the first of the
 * languages asked for that the document states it in.
 */
const rulesIn = (document: unknown, address: string, languages: readonly string[], into: Map<string, RuleText>) => {
    if (!isObject(document)) return
    const contexts: unknown[] = [document['@context']].flat()
    const context = contexts.filter(isObject).reduce<JsonObject>((all, one) => ({ ...all, ...one }), {})
    const base = typeof context['@base'] === 'string' ? context['@base'] : address
    const names = keysFor(context, LABEL)
    const texts = keysFor(context, CONTENT)
    const graph = document['@graph']
    const nodes: unknown[] = Array.isArray(graph) ? graph : [document]

    for (const node of nodes) {
        if (!isObject(node) || typeof node['@id'] !== 'string') continue
        const iri = iriOf(node['@id'], base)
        if (!iri) continue
        into.set(iri, {
            name: names.map(key => literal(node[key], languages)).find(Boolean),
            text: texts.map(key => literal(node[key], languages)).find(Boolean),
            order: into.size
        })
    }
}

/**
 * The rules a page states, by IRI, from the JSON-LD it carries in
 * `application/ld+json` script blocks, each in the first of the languages
 * asked for, by default the reader's, that the page states it in. A plain
 * JSON-LD document is read the same way.
 */
export const rulesOnPage = (page: string, address: string, languages: readonly string[] = readersLanguages()): Map<string, RuleText> => {
    const blocks = [...page.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1] ?? '')
    const rules = new Map<string, RuleText>()
    for (const block of blocks.length > 0 ? blocks : [page]) {
        try {
            rulesIn(JSON.parse(block), address, languages, rules)
        } catch {
            // A block that is no JSON states no rule.
        }
    }
    return rules
}

/** The page an IRI leads to: the IRI without its fragment. */
const pageOf = (iri: string): string => iri.split('#')[0] ?? iri

/** Each page asked for once per visit; one that cannot be read states nothing. */
const pages = new Map<string, Promise<Map<string, RuleText>>>()

const read = (page: string): Promise<Map<string, RuleText>> => {
    let reading = pages.get(page)
    if (!reading) {
        reading = fetch(page)
            .then(response => response.ok ? response.text() : '')
            .then(text => rulesOnPage(text, page))
            .catch(() => new Map<string, RuleText>())
        pages.set(page, reading)
    }
    return reading
}

/**
 * The rules, each with what its page says of it once the page is read.
 * Until then, and where it cannot be read, a rule is its IRI alone.
 */
export const useRules = (iris: readonly string[]): Rule[] => {
    const [texts, setTexts] = useState<ReadonlyMap<string, RuleText>>(new Map())
    // The IRIs hold no space, so their joined text stands for them, and a
    // new array of the same rules reads nothing again.
    const key = iris.join(' ')

    useEffect(() => {
        let current = true
        const wanted = [...new Set(key.split(' ').filter(Boolean).map(pageOf))]
        void Promise.all(wanted.map(read)).then(read => {
            if (current) setTexts(new Map(read.flatMap(rules => [...rules])))
        })
        return () => { current = false }
    }, [key])

    return iris.map(iri => ({ iri, ...texts.get(iri) }))
}

/** The rules in the order their pages state them, those not read last. */
export const inPageOrder = (rules: readonly Rule[]): Rule[] =>
    [...rules].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))

/** What a rule is called: its name, or else the fragment of its IRI. */
export const ruleLabel = (rule: Rule): string =>
    rule.name ?? (decodeURIComponent(rule.iri.split('#')[1] ?? '') || rule.iri)
