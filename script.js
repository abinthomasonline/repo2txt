// Initial list of common file extensions
let commonExtensions = ['.js', '.py', '.java', '.cpp', '.html', '.css', '.ts', '.jsx', '.tsx'];

// Function to normalize extension input
function normalizeExtension(ext) {
    ext = ext.trim().toLowerCase();
    if (!ext.startsWith('.')) {
        ext = '.' + ext;
    }
    return ext;
}

// Function to render the list of added extensions
function renderExtensionList() {
    const extensionList = document.getElementById('extensionList');
    extensionList.innerHTML = '';
    commonExtensions.forEach((ext, index) => {
        const li = document.createElement('li');
        li.className = 'extension-item';
        
        const span = document.createElement('span');
        span.textContent = ext;
        li.appendChild(span);
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-extension';
        removeButton.innerHTML = '<i data-lucide="x" class="w-4 h-4"></i>';
        removeButton.title = 'Remove extension';
        removeButton.addEventListener('click', () => {
            commonExtensions.splice(index, 1);
            renderExtensionList();
            updateDirectoryStructure();
        });
        li.appendChild(removeButton);
        
        extensionList.appendChild(li);
    });
    lucide.createIcons();
}

// Function to update directory structure based on current extensions
function updateDirectoryStructure() {
    const checkboxes = document.querySelectorAll('#directoryStructure input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (!checkbox.classList.contains('directory-checkbox')) {
            const fileInfo = JSON.parse(checkbox.value);
            const filePath = fileInfo.path.toLowerCase();
            const isCommonFile = commonExtensions.some(ext => filePath.endsWith(ext));
            checkbox.checked = isCommonFile;
        }
    });
}

// Event listener for adding new extensions
document.getElementById('addExtensionButton').addEventListener('click', function() {
    const newExtInput = document.getElementById('newExtension');
    const newExt = normalizeExtension(newExtInput.value);
    if (newExt && !commonExtensions.includes(newExt)) {
        commonExtensions.push(newExt);
        newExtInput.value = '';
        renderExtensionList();
        updateDirectoryStructure();
    }
});

// Allow adding extension by pressing Enter key
document.getElementById('newExtension').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('addExtensionButton').click();
    }
});

// Event listener for the repository form submission
document.getElementById('repoForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const repoUrl = document.getElementById('repoUrl').value;
    const ref = document.getElementById('ref').value || '';
    const path = document.getElementById('path').value || '';
    const accessToken = document.getElementById('accessToken').value;

    const outputText = document.getElementById('outputText');
    outputText.value = '';

    try {
        const { owner, repo, refFromUrl, pathFromUrl } = parseRepoUrl(repoUrl);
        const finalRef = ref || refFromUrl;
        const finalPath = path || pathFromUrl;

        const sha = await fetchRepoSha(owner, repo, finalRef, finalPath, accessToken);
        const tree = await fetchRepoTree(owner, repo, sha, accessToken);

        displayDirectoryStructure(tree);
        document.getElementById('generateTextButton').style.display = 'flex';
    } catch (error) {
        outputText.value = `Error fetching repository contents: ${error.message}\n\nPlease ensure:\n1. The repository URL is correct and accessible.\n2. You have the necessary permissions to access the repository.\n3. If it's a private repository, you've provided a valid access token.\n4. The specified branch/tag and path (if any) exist in the repository.`;
    }
});

// Event listener for generating the text file
document.getElementById('generateTextButton').addEventListener('click', async function () {
    const accessToken = document.getElementById('accessToken').value;
    const outputText = document.getElementById('outputText');
    outputText.value = '';

    try {
        const selectedFiles = getSelectedFiles();
        if (selectedFiles.length === 0) {
            throw new Error('No files selected');
        }
        const fileContents = await fetchFileContents(selectedFiles, accessToken);
        const formattedText = formatRepoContents(fileContents);
        outputText.value = formattedText;

        document.getElementById('copyButton').style.display = 'flex';
        document.getElementById('downloadButton').style.display = 'flex';
    } catch (error) {
        outputText.value = `Error generating text file: ${error.message}\n\nPlease ensure:\n1. You have selected at least one file from the directory structure.\n2. Your access token (if provided) is valid and has the necessary permissions.\n3. You have a stable internet connection.\n4. The GitHub API is accessible and functioning normally.`;
    }
});

// Event listener for copying to clipboard
document.getElementById('copyButton').addEventListener('click', function () {
    const outputText = document.getElementById('outputText');
    outputText.select();
    navigator.clipboard.writeText(outputText.value).then(() => {
        console.log('Text copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
});

// Event listener for downloading the text file
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
    a.download = 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
});

// Function to parse the GitHub repository URL
function parseRepoUrl(url) {
    url = url.replace(/\/$/, '');
    const urlPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/tree\/([^\/]+)(\/(.+))?)?$/;
    const match = url.match(urlPattern);
    if (!match) {
        throw new Error('Invalid GitHub repository URL. Please ensure the URL is in the correct format: https://github.com/owner/repo or https://github.com/owner/repo/tree/branch/path');
    }
    return {
        owner: match[1],
        repo: match[2],
        refFromUrl: match[4],
        pathFromUrl: match[6]
    };
}

// Function to fetch repository SHA
async function fetchRepoSha(owner, repo, ref, path, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path ? `${path}` : ''}${ref ? `?ref=${ref}` : ''}`;
    const headers = {
        'Accept': 'application/vnd.github.object+json'
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
            throw new Error('GitHub API rate limit exceeded. Please try again later or provide a valid access token to increase your rate limit.');
        }
        if (response.status === 404) {
            throw new Error(`Repository, branch, or path not found. Please check that the URL, branch/tag, and path are correct and accessible.`);
        }
        throw new Error(`Failed to fetch repository SHA. Status: ${response.status}. Please check your input and try again.`);
    }
    const data = await response.json();
    return data.sha;
}

// Function to fetch repository tree
async function fetchRepoTree(owner, repo, sha, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`;
    const headers = {
        'Accept': 'application/vnd.github+json'
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
            throw new Error('GitHub API rate limit exceeded. Please try again later or provide a valid access token to increase your rate limit.');
        }
        throw new Error(`Failed to fetch repository tree. Status: ${response.status}. Please check your input and try again.`);
    }
    const data = await response.json();
    return data.tree;
}

// Function to display the directory structure
function displayDirectoryStructure(tree) {
    tree = tree.filter(item => item.type === 'blob');
    tree = sortContents(tree);
    const container = document.getElementById('directoryStructure');
    container.innerHTML = '';
    const rootUl = document.createElement('ul');
    container.appendChild(rootUl);

    const directoryStructure = {};

    tree.forEach(item => {
        item.path = item.path.startsWith('/') ? item.path : '/' + item.path;
        const pathParts = item.path.split('/');
        let currentLevel = directoryStructure;

        pathParts.forEach((part, index) => {
            if (part === '') {
                part = './';
            }
            if (!currentLevel[part]) {
                currentLevel[part] = index === pathParts.length - 1 ? item : {};
            }
            currentLevel = currentLevel[part];
        });
    });

    function createTreeNode(name, item, parentUl) {
        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        const fileName = name.toLowerCase();
        const isCommonFile = commonExtensions.some(ext => fileName.endsWith(ext));
        checkbox.checked = isCommonFile;
        checkbox.className = 'mr-2';
        
        if (typeof item === 'object' && (!item.type || typeof item.type !== 'string')) {
            // Directory
            checkbox.classList.add('directory-checkbox');
            li.appendChild(checkbox);

            // Add collapse/expand button
            const collapseButton = document.createElement('button');
            collapseButton.innerHTML = '<i data-lucide="chevron-down" class="w-4 h-4"></i>';
            collapseButton.className = 'mr-1 focus:outline-none';
            li.appendChild(collapseButton);

            const folderIcon = document.createElement('i');
            folderIcon.setAttribute('data-lucide', 'folder');
            folderIcon.className = 'inline-block w-4 h-4 mr-1';
            li.appendChild(folderIcon);
            li.appendChild(document.createTextNode(name));
            const ul = document.createElement('ul');
            ul.className = 'ml-6 mt-2';
            li.appendChild(ul);
            
            for (const [childName, childItem] of Object.entries(item)) {
                createTreeNode(childName, childItem, ul);
            }

            checkbox.addEventListener('change', function() {
                const childCheckboxes = li.querySelectorAll('input[type="checkbox"]');
                childCheckboxes.forEach(childBox => {
                    childBox.checked = this.checked;
                    childBox.indeterminate = false;
                });
            });

            // Add collapse/expand functionality
            collapseButton.addEventListener('click', function() {
                ul.classList.toggle('hidden');
                const icon = this.querySelector('[data-lucide]');
                if (ul.classList.contains('hidden')) {
                    icon.setAttribute('data-lucide', 'chevron-right');
                } else {
                    icon.setAttribute('data-lucide', 'chevron-down');
                }
                lucide.createIcons();
            });
        } else {
            // File
            checkbox.value = JSON.stringify({ url: item.url, path: item.path });
            li.appendChild(checkbox);
            const fileIcon = document.createElement('i');
            fileIcon.setAttribute('data-lucide', 'file');
            fileIcon.className = 'inline-block w-4 h-4 mr-1';
            li.appendChild(fileIcon);
            li.appendChild(document.createTextNode(name));
        }

        li.className = 'my-2';
        parentUl.appendChild(li);
        updateParentCheckbox(checkbox);
    }

    for (const [name, item] of Object.entries(directoryStructure)) {
        createTreeNode(name, item, rootUl);
    }
    // Add event listener to container for checkbox changes
    container.addEventListener('change', function(event) {
        if (event.target.type === 'checkbox') {
            updateParentCheckbox(event.target);
        }
    });

    function updateParentCheckbox(checkbox) {
        if (!checkbox) return;
        const li = checkbox.closest('li');
        if (!li) return;
        if (!li.parentElement) return;
        const parentLi = li.parentElement.closest('li');
        if (!parentLi) return;

        const parentCheckbox = parentLi.querySelector(':scope > input[type="checkbox"]');
        const siblingCheckboxes = parentLi.querySelectorAll(':scope > ul > li > input[type="checkbox"]');
        
        const checkedCount = Array.from(siblingCheckboxes).filter(cb => cb.checked).length;
        const indeterminateCount = Array.from(siblingCheckboxes).filter(cb => cb.indeterminate).length;
        
        if (indeterminateCount !== 0) {
            parentCheckbox.checked = false;
            parentCheckbox.indeterminate = true;
        } else if (checkedCount === 0) {
            parentCheckbox.checked = false;
            parentCheckbox.indeterminate = false;
        } else if (checkedCount === siblingCheckboxes.length) {
            parentCheckbox.checked = true;
            parentCheckbox.indeterminate = false;
        } else {
            parentCheckbox.checked = false;
            parentCheckbox.indeterminate = true;
        }

        // Recursively update parent checkboxes
        updateParentCheckbox(parentCheckbox);
    }

    lucide.createIcons();
}

// Function to get selected files
function getSelectedFiles() {
    const checkboxes = document.querySelectorAll('#directoryStructure input[type="checkbox"]:checked:not(.directory-checkbox)');
    return Array.from(checkboxes).map(checkbox => JSON.parse(checkbox.value));
}

// Function to fetch file contents
async function fetchFileContents(files, token) {
    const headers = {
        'Accept': 'application/vnd.github.v3.raw'
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }
    const contents = await Promise.all(files.map(async file => {
        const response = await fetch(file.url, { headers });
        if (!response.ok) {
            if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
                throw new Error(`GitHub API rate limit exceeded while fetching ${file.path}. Please try again later or provide a valid access token to increase your rate limit.`);
            }
            throw new Error(`Failed to fetch content for ${file.path}. Status: ${response.status}. Please check your permissions and try again.`);
        }
        const text = await response.text();
        return { url: file.url, path: file.path, text };
    }));
    return contents;
}

// Function to format repository contents into text
function formatRepoContents(contents) {
    let text = '';
    let index = '';

    contents = sortContents(contents);

    // Create a directory tree structure
    const tree = {};
    contents.forEach(item => {
        const parts = item.path.split('/');
        let currentLevel = tree;
        parts.forEach((part, i) => {
            if (!currentLevel[part]) {
                currentLevel[part] = i === parts.length - 1 ? null : {};
            }
            currentLevel = currentLevel[part];
        });
    });

    // Function to recursively build the index
    function buildIndex(node, prefix = '') {
        let result = '';
        const entries = Object.entries(node);
        entries.forEach(([name, subNode], index) => {
            const isLastItem = index === entries.length - 1;
            const linePrefix = isLastItem ? '└── ' : '├── ';
            const childPrefix = isLastItem ? '    ' : '│   ';

            if (name === '') {
                name = './';
            }

            result += `${prefix}${linePrefix}${name}\n`;
            if (subNode) {
                result += buildIndex(subNode, `${prefix}${childPrefix}`);
            }
        });
        return result;
    }

    index = buildIndex(tree);

    contents.forEach((item) => {
        text += `\n\n---\nFile: ${item.path}\n---\n\n${item.text}\n`;
    });

    return `Directory Structure:\n\n${index}\n${text}`;
}

// Function to sort contents
function sortContents(contents) {
    contents.sort((a, b) => {
        const aPath = a.path.split('/');
        const bPath = b.path.split('/');
        const minLength = Math.min(aPath.length, bPath.length);

        for (let i = 0; i < minLength; i++) {
            if (aPath[i] !== bPath[i]) {
                if (i === aPath.length - 1 && i < bPath.length - 1) return 1; // a is a directory, b is a file or subdirectory
                if (i === bPath.length - 1 && i < aPath.length - 1) return -1;  // b is a directory, a is a file or subdirectory
                return aPath[i].localeCompare(bPath[i]);
            }
        }

        return aPath.length - bPath.length;
    });
    return contents;
}

document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();
    renderExtensionList();

    // Add event listener for the showMoreInfo button
    const showMoreInfoButton = document.getElementById('showMoreInfo');
    const tokenInfo = document.getElementById('tokenInfo');

    showMoreInfoButton.addEventListener('click', function() {
        tokenInfo.classList.toggle('hidden');
        
        // Change the icon based on the visibility state
        const icon = this.querySelector('[data-lucide]');
        if (icon) {
            if (tokenInfo.classList.contains('hidden')) {
                icon.setAttribute('data-lucide', 'info');
            } else {
                icon.setAttribute('data-lucide', 'x');
            }
            lucide.createIcons();
        }
    });
});
