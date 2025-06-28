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
            {(childrenMap[parentId] || []).map(version => {
                const active = currentVersion?.id === version.id
                return (
                    <li
                        key={version.id}
                        onClick={e => {
                            onClick(version)
                            e.stopPropagation()
                        }}
                    >
                        <div
                            className={`siglum ${active ? 'active' : ''}`}
                        >
                            <span style={{
                                fontWeight: active ? 'bold' : 'normal'
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
                )
            })}
        </ul>
    )

    return renderTree('root')
}
