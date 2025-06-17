import { flat, Stage } from 'linked-rolls'
import './Stemma.css'

interface Stemma {
    stages: Stage[]
    currentStage?: Stage
    onClick: (stage: Stage) => void
}

export const Stemma = ({ stages, currentStage, onClick }: Stemma) => {
    const childrenMap: Record<string, Stage[]> = {}

    // Group stages by their parent id
    stages.forEach(stage => {
        const parentId = stage.basedOn ? flat(stage.basedOn).id : 'root'
        if (!childrenMap[parentId]) childrenMap[parentId] = []
        childrenMap[parentId].push(stage)
    })

    const renderTree = (parentId: string) => (
        <ul className={parentId === 'root' ? 'tree' : undefined}>
            {(childrenMap[parentId] || []).map(stage => (
                <li
                    key={stage.id}
                    onClick={e => {
                        onClick(stage)
                        e.stopPropagation()
                    }}
                >
                    <span
                        className='siglum'
                        style={{
                            fontWeight: stage.id === currentStage?.id ? 'bold' : 'normal'
                        }}
                    >
                        {stage.siglum}
                    </span>
                    {childrenMap[stage.id]?.length > 0 && renderTree(stage.id)}
                </li>
            ))}
        </ul>
    )

    return renderTree('root')
}
