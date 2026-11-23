import { useEffect, useState } from "react"
import { px } from "linked-rolls"
import { ImageService, tilesOf } from "./IIIF"
import { paperAmong, Rgb } from "./laterHand"

/** The pixels of an image, cut to a run of its columns, or nothing where the page may not read them. */
const pixelsOf = (url: string, from: number, to: number) =>
    new Promise<Uint8ClampedArray | undefined>(resolve => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onerror = () => resolve(undefined)
        image.onload = () => {
            const width = Math.max(1, Math.round(to - from))
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = image.naturalHeight
            const context = canvas.getContext('2d')
            if (!context) return resolve(undefined)

            context.drawImage(image, -from, 0)
            try {
                resolve(context.getImageData(0, 0, width, image.naturalHeight).data)
            } catch {
                // A server that sends no CORS header leaves the canvas unreadable.
                resolve(undefined)
            }
        }
        image.src = url
    })

const sampled = new Map<string, Promise<Rgb | undefined>>()

/**
 * The colour of a scan's paper, read off the coarsest tile at the middle
 * of the roll and the middle third of its width, which is paper whatever
 * margin the scanner left round it, and well away from the leader. Each
 * scan is read once.
 */
export const paperColourOf = (service: ImageService): Promise<Rgb | undefined> => {
    const known = sampled.get(service.baseUrl)
    if (known) return known

    const factor = Math.max(...service.scaleFactors)
    const columns = { from: px(service.width / 3), to: px(service.width * 2 / 3) }
    const middle = service.height / 2
    const tile = tilesOf(service, factor, columns).find(tile => tile.y <= middle && middle < tile.y + tile.height)

    const reading = tile
        ? pixelsOf(
            tile.url,
            Math.max(0, (columns.from - tile.x) / factor),
            Math.min(tile.tileWidth, (columns.to - tile.x) / factor)
        ).then(pixels => pixels && paperAmong(pixels))
        : Promise.resolve(undefined)

    sampled.set(service.baseUrl, reading)
    return reading
}

/** The colour of the scan's paper, once it has been read, and nothing before or where it cannot be. */
export const usePaperColour = (service: ImageService | undefined): Rgb | undefined => {
    const [paper, setPaper] = useState<{ of: string, colour?: Rgb }>()

    useEffect(() => {
        if (!service) return

        let stale = false
        void paperColourOf(service).then(colour => {
            if (!stale) setPaper({ of: service.baseUrl, colour })
        })
        return () => { stale = true }
    }, [service])

    return service && paper?.of === service.baseUrl ? paper.colour : undefined
}
