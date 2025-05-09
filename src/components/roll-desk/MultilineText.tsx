function getTextWidth(text: string, font: string): number {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
        context.font = font;
        return context.measureText(text).width;
    }
    return 0;
}

interface MultilineTextProps {
    text: string
    maxWidth: number
    svgProps: React.SVGProps<SVGTextElement>
}

export const MultilineText = ({ text, maxWidth, svgProps }: MultilineTextProps) => {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    words.forEach(word => {
        const testLine = currentLine + word + ' '
        const testWidth = getTextWidth(testLine, `${svgProps.fontSize || 16}px`)

        if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine.trim())
            currentLine = word + ' '
        } else {
            currentLine = testLine
        }
    })

    if (currentLine) {
        lines.push(currentLine.trim())
    }

    return (
        <text {...svgProps}>
            {lines.map((line, index) => (
                <tspan key={index} x={svgProps.x} dy={index === 0 ? 0 : '1.2em'}>
                    {line}
                </tspan>
            ))}
        </text>
    )
}
