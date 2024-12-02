// Function to extract files from a zip archive
async function extractZipContents(zipFile) {
    try {
        const zip = await JSZip.loadAsync(zipFile);
        const tree = [];
        const gitignoreContent = ['.git/**'];

        // Process each file in the zip
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (!zipEntry.dir) {
                const content = await zipEntry.async('text');
                const blob = new Blob([content], { type: 'text/plain' });
                tree.push({
                    path: relativePath,
                    type: 'blob',
                    url: URL.createObjectURL(blob),
                    text: content
                });

                // Check for .gitignore file
                if (relativePath.endsWith('.gitignore')) {
                    const lines = content.split('\n');
                    const gitignorePath = relativePath.split('/').slice(0, -1).join('/');
                    lines.forEach(line => {
                        line = line.trim();
                        if (line && !line.startsWith('#')) {
                            if (gitignorePath) {
                                gitignoreContent.push(`${gitignorePath}/${line}`);
                            } else {
                                gitignoreContent.push(line);
                            }
                        }
                    });
                }
            }
        }

        return { tree, gitignoreContent };
    } catch (error) {
        throw new Error(`Failed to extract zip contents: ${error.message}`);
    }
}

export { extractZipContents };
