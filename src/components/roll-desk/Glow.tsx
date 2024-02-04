export const Glow = () => {
    return (
        <defs>
            <filter id="purple-glow" x="-1000%" y="-1000%" width="5000%" height="5000%">
                <feFlood result="flood" flood-color="#7d26cd" flood-opacity="1"></feFlood>
                <feComposite in="flood" result="mask" in2="SourceGraphic" operator="in"></feComposite>
                <feMorphology in="mask" result="dilated" operator="dilate" radius="0.1"></feMorphology>
                <feGaussianBlur in="dilated" result="blurred" stdDeviation="0.5"></feGaussianBlur>
                <feMerge>
                    <feMergeNode in="blurred"></feMergeNode>
                    <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
            </filter>
        </defs>
    )
}