export function Spray() {
    return (
        <defs>
            <filter
                id="spray"
                x="-30%"
                y="-30%"
                width="160%"
                height="160%"
                filterUnits="objectBoundingBox"
                colorInterpolationFilters="sRGB"
            >
                {/* Base noise field */}
                <feTurbulence
                    type="fractalNoise"
                    baseFrequency="2"
                    numOctaves="2"
                    seed="7"
                    result="noise"
                />

                {/* Turn noise into sparse speckles (spray particles) */}
                <feColorMatrix
                    in="noise"
                    type="matrix"
                    values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 6 -3.2"
                    result="speckleAlpha"
                />

                {/* Slightly blur speckles to feel like aerosol */}
                <feGaussianBlur in="speckleAlpha" stdDeviation="0.35" result="speckleSoft" />

                {/* Add a tiny random displacement to the source to break edges */}
                <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale="3.5"
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="displaced"
                />

                {/* Make a faint mist layer */}
                <feGaussianBlur in="displaced" stdDeviation="0.6" result="mist" />
                <feComponentTransfer in="mist" result="mistFaint">
                    <feFuncA type="gamma" amplitude="0.7" exponent="1.6" offset="0" />
                </feComponentTransfer>

                {/* Composite: overlay speckles + a bit of mist on top of displaced source */}
                <feComposite in="speckleSoft" in2="displaced" operator="in" result="specklesOnShape" />
                <feMerge>
                    <feMergeNode in="displaced" />
                    <feMergeNode in="mistFaint" />
                    <feMergeNode in="specklesOnShape" />
                </feMerge>
            </filter>
        </defs>
    );
}
