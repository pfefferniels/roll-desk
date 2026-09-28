export const downloadFile = (filename: string, content: string | Uint8Array, mimeType: string) => {
    const element = document.createElement('a')
    const part: BlobPart = typeof content === 'string' ? content : new Uint8Array(content)
    const file = new Blob([part], { type: mimeType })
    element.href = URL.createObjectURL(file)
    element.download = filename
    element.click()
    URL.revokeObjectURL(element.href)
}

