export const downloadFile = (filename: string, content: string, mimeType: string) => {
    const element = document.createElement('a')
    const file = new Blob([content], { type: mimeType })
    element.href = URL.createObjectURL(file)
    element.download = filename
    element.click()
}
