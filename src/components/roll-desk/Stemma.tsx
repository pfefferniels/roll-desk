import { flat, Version } from 'linked-rolls'
import './Stemma.css'

interface Stemma {
    versions: Version[]
    currentVersion?: Version
    onClick: (version: Version) => void
}

export const Stemma = ({ versions, currentVersion, onClick }: Stemma) => {
    const childrenMap: Record<string, Version[]> = {}

    // Group versions by their parent id
    versions.forEach(version => {
        const parentId = version.basedOn ? flat(version.basedOn).id : 'root'
        if (!childrenMap[parentId]) childrenMap[parentId] = []
        childrenMap[parentId].push(version)
    })

    const renderTree = (parentId: string) => (
        <ul className={parentId === 'root' ? 'tree' : undefined}>
            {(childrenMap[parentId] || []).map(version => (
                <li
                    key={version.id}
                    onClick={e => {
                        onClick(version)
                        e.stopPropagation()
                    }}
                >
                    <div
                        className='siglum'
                    >
                        <span style={{
                            fontWeight: version.id === currentVersion?.id ? 'bold' : 'normal'
                        }}>
                            {version.siglum}
                        </span>
                        <br />
                        <span style={{ fontSize: '0.9rem' }}>
                            {version.type.replaceAll('-', ' ')}
                        </span>
                        <br />
                        +{version.edits.map(edit => edit.insert || []).flat().length},
                        -{version.edits.map(edit => edit.delete || []).flat().length}
                    </div>
                    {childrenMap[version.id]?.length > 0 && renderTree(version.id)}
                </li>
            ))}
        </ul>
    )

    return renderTree('root')
}
