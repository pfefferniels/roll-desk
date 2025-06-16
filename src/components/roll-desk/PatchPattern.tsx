export const PatchPattern = () => {
    return (
        <defs>
            <pattern id="patchPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="#d3d3d3" />

                {/*Vertical stitches*/}
                <line x1="5" y1="0" x2="5" y2="10" stroke="black" strokeWidth="0.5" />
                <line x1="2.5" y1="0" x2="2.5" y2="10" stroke="black" strokeWidth="0.5" />
                <line x1="7.5" y1="0" x2="7.5" y2="10" stroke="black" strokeWidth="0.5" />

                {/*Horizontal stitches*/}
                <line x1="0" y1="5" x2="10" y2="5" stroke="black" strokeWidth="0.5" />
                <line x1="0" y1="2.5" x2="10" y2="2.5" stroke="black" strokeWidth="0.5" />
                <line x1="0" y1="7.5" x2="10" y2="7.5" stroke="black" strokeWidth="0.5" />

                {/*Diagonal stitches*/}
                <line x1="0" y1="0" x2="10" y2="10" stroke="black" strokeWidth="0.5" />
                <line x1="10" y1="0" x2="0" y2="10" stroke="black" strokeWidth="0.5" />
            </pattern>
        </defs>
    )
}
