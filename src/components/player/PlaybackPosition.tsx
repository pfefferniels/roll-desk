interface PlaybackPositionProps {
    position: number
}

export const PlaybackPosition: React.FC<PlaybackPositionProps> = ({ position }) => {
    return (
        <line
          className={'playbackPosition'}
          x1={position}
          y1={0}
          x2={position}
          y2={300} />
    )
}
