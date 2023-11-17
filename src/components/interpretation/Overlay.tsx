import { ReactNode } from "react"

interface OverlayProps {
    anchorEl?: Element
    children: ReactNode
}

export const Overlay = ({ anchorEl, children }: OverlayProps) => {
    if (!anchorEl) return null

    const bbox = (anchorEl as SVGGraphicsElement).getBoundingClientRect()
    const top = bbox.x
    const left = bbox.y

    return (
        <div style={{
            position: 'absolute',
            top,
            left,
            border: '1px solid black',
            borderRadius: '0.2rem',
            backgroundColor: 'white'
        }}>
            {children}
        </div>
    )
}