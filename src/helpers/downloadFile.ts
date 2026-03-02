export const downloadFile = (filename: string, content: string | Uint8Array, mimeType: string) => {
    const element = document.createElement('a')
    const data = content instanceof Uint8Array ? content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) : content
    const file = new Blob([data], { type: mimeType })
    element.href = URL.createObjectURL(file)
    element.download = filename
    element.click()
    URL.revokeObjectURL(element.href)
}

