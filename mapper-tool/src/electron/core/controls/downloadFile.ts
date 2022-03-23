export function downloadFile(content: string, mimeType: string, filename: string) {
    const blob = new Blob([content], { type: mimeType });
    const downloadURL = window.URL.createObjectURL(blob);

    // To download a file we need to create a temporary anchor and click it programatically
    const temp = document.createElement('a');
    temp.style.display = 'none';
    temp.href = downloadURL;

    temp.setAttribute('download', filename);

    // Not all browsers support the 'download' attribute
    if (typeof temp.download === 'undefined') {
        temp.setAttribute('target', '_blank');
    }

    // Firefox needs the anchor to be added to the body
    document.body.appendChild(temp);
    temp.click();
    document.body.removeChild(temp);
}