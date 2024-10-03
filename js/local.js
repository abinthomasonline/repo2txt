import { displayDirectoryStructure, sortContents, getSelectedFiles, formatRepoContents } from './utils.js';

// Event listener for directory selection
document.getElementById('directoryPicker').addEventListener('change', handleDirectorySelection);

async function handleDirectorySelection(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    const gitignoreContent = ['.git/**']
    const tree = [];
    for (let file of files) {
        const filePath = file.webkitRelativePath.split('/').slice(1).join('/');
        tree.push({
            path: filePath,
            type: 'blob',
            url: URL.createObjectURL(file)
        });
        if (file.webkitRelativePath.endsWith('.gitignore')) {
            const gitignoreReader = new FileReader();
            gitignoreReader.onload = function(e) {
                const content = e.target.result;
                const lines = content.split('\n');
                const gitignorePath = file.webkitRelativePath.split('/').slice(1, -1).join('/');
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
                filterAndDisplayTree(tree, gitignoreContent);
            };
            gitignoreReader.readAsText(file);
        }
    }

    if (!tree.some(file => file.path.endsWith('.gitignore'))) {
        filterAndDisplayTree(tree, gitignoreContent);
    }
}

function filterAndDisplayTree(tree, gitignoreContent) {
    // Filter tree based on gitignore rules
    const filteredTree = tree.filter(file => !isIgnored(file.path, gitignoreContent));

    // Sort the tree
    filteredTree.sort(sortContents);

    // Display the directory structure
    displayDirectoryStructure(filteredTree);

    // Show the generate text button
    document.getElementById('generateTextButton').style.display = 'flex';
}

// Event listener for generating text file
document.getElementById('generateTextButton').addEventListener('click', async function () {
    const outputText = document.getElementById('outputText');
    outputText.value = '';

    try {
        const selectedFiles = getSelectedFiles();
        if (selectedFiles.length === 0) {
            throw new Error('No files selected');
        }
        const fileContents = await fetchFileContents(selectedFiles);
        const formattedText = formatRepoContents(fileContents);
        outputText.value = formattedText;

        document.getElementById('copyButton').style.display = 'flex';
        document.getElementById('downloadButton').style.display = 'flex';
    } catch (error) {
        outputText.value = `Error generating text file: ${error.message}\n\n` +
            "Please ensure:\n" +
            "1. You have selected at least one file from the directory structure.\n" +
            "2. The selected files are accessible and readable.\n" +
            "3. You have sufficient permissions to read the selected files.";
    }
});

// Fetch contents of selected files
async function fetchFileContents(files) {
    const contents = await Promise.all(files.map(async file => {
        const response = await fetch(file.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${file.path}`);
        }
        const text = await response.text();
        return { url: file.url, path: file.path, text };
    }));
    return contents;
}

// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();
});

function isIgnored(filePath, gitignoreRules) {
    return gitignoreRules.some(rule => {
        // Convert gitignore rule to regex
        let pattern = rule.replace(/\./g, '\\.')  // Escape dots
                          .replace(/\*/g, '.*')   // Convert * to .*
                          .replace(/\?/g, '.')    // Convert ? to .
                          .replace(/\/$/, '(/.*)?$')  // Handle directory matches
                          .replace(/^\//, '^');   // Handle root-level matches

        // If the rule doesn't start with ^, it can match anywhere in the path
        if (!pattern.startsWith('^')) {
            pattern = `(^|/)${pattern}`;
        }

        const regex = new RegExp(pattern);
        return regex.test(filePath);
    });
}

// Event listener for copying text to clipboard
document.getElementById('copyButton').addEventListener('click', function () {
    const outputText = document.getElementById('outputText');
    outputText.select();
    navigator.clipboard.writeText(outputText.value)
        .then(() => console.log('Text copied to clipboard'))
        .catch(err => console.error('Failed to copy text: ', err));
});

// Event listener for downloading text file
document.getElementById('downloadButton').addEventListener('click', function () {
    const outputText = document.getElementById('outputText').value;
    if (!outputText.trim()) {
        document.getElementById('outputText').value = 'Error: No content to download. Please generate the text file first.';
        return;
    }
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt.txt';
    a.click();
    URL.revokeObjectURL(url);
});

