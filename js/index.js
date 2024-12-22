import { displayDirectoryStructure, getSelectedFiles, formatRepoContents } from './utils.js';

// Load saved token on page load
document.addEventListener('DOMContentLoaded', async function() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = loadingOverlay.querySelector('.loading-text');
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    loadingText.textContent = 'Initializing...';

    try {
        lucide.createIcons();
        loadingText.textContent = 'Setting up components...';
        setupTokenInput();
        loadSavedToken();
        setupThemeToggle();

        loadingText.textContent = 'Checking repository...';
        // Check current URL and update header
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const isValid = isValidGithubRepo(tab.url);
            updateHeaderStatus(isValid);
        } catch (error) {
            updateHeaderStatus(false);
        }
    } catch (error) {
        console.error('Initialization error:', error);
    } finally {
        // Hide loading overlay
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            loadingOverlay.style.opacity = '1';
            loadingOverlay.style.transition = '';
        }, 300);
    }
});

// Load saved token from local storage
function loadSavedToken() {
    const savedToken = localStorage.getItem('githubAccessToken');
    if (savedToken) {
        document.getElementById('accessToken').value = savedToken;
    }
}

// Save token to local storage
function saveToken(token) {
    if (token) {
        localStorage.setItem('githubAccessToken', token);
    } else {
        localStorage.removeItem('githubAccessToken');
    }
}

// Event listener for form submission
document.getElementById('repoForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = loadingOverlay.querySelector('.loading-text');
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    loadingText.textContent = 'Fetching repository structure...';

    const accessToken = document.getElementById('accessToken').value;

    // Save token automatically
    saveToken(accessToken);

    const outputText = document.getElementById('outputText');
    outputText.value = '';

    try {
        // Get current tab URL and clean it
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const repoUrl = cleanGithubUrl(tab.url);

        if (!isValidGithubRepo(repoUrl)) {
            throw new Error('Please open this extension on a GitHub repository page');
        }

        // Parse repository URL and fetch repository contents
        const { owner, repo, lastString } = parseRepoUrl(repoUrl);
        let refFromUrl = '';
        let pathFromUrl = '';

        if (lastString) {
            const references = await getReferences(owner, repo, accessToken);
            const allRefs = [...references.branches, ...references.tags];
            
            const matchingRef = allRefs.find(ref => lastString.startsWith(ref));
            if (matchingRef) {
                refFromUrl = matchingRef;
                pathFromUrl = lastString.slice(matchingRef.length + 1);
            } else {
                refFromUrl = lastString;
            }
        }

        const sha = await fetchRepoSha(owner, repo, refFromUrl, pathFromUrl, accessToken);
        const tree = await fetchRepoTree(owner, repo, sha, accessToken);

        loadingText.textContent = 'Processing repository structure...';
        displayDirectoryStructure(tree);
        document.getElementById('generateTextButton').style.display = 'flex';
        document.getElementById('downloadZipButton').style.display = 'flex';
    } catch (error) {
        outputText.value = `Error: ${error.message}\n\n` +
            "Please ensure:\n" +
            "1. You are on a GitHub repository page\n" +
            "2. You have the necessary permissions to access the repository\n" +
            "3. If it's a private repository, you've provided a valid access token\n" +
            "4. The specified branch/tag and path (if any) exist in the repository";
    } finally {
        // Hide loading overlay
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            loadingOverlay.style.opacity = '1';
        }, 300);
    }
});

// Event listener for generating text file
document.getElementById('generateTextButton').addEventListener('click', async function () {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = loadingOverlay.querySelector('.loading-text');
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    loadingText.textContent = 'Generating text file...';

    const accessToken = document.getElementById('accessToken').value;
    const outputText = document.getElementById('outputText');
    outputText.value = '';

    // Save token automatically
    saveToken(accessToken);

    try {
        const selectedFiles = getSelectedFiles();
        if (selectedFiles.length === 0) {
            throw new Error('No files selected');
        }
        loadingText.textContent = 'Fetching file contents...';
        const fileContents = await fetchFileContents(selectedFiles, accessToken);
        loadingText.textContent = 'Formatting content...';
        const formattedText = formatRepoContents(fileContents);
        outputText.value = formattedText;

        document.getElementById('copyButton').style.display = 'flex';
        document.getElementById('downloadButton').style.display = 'flex';
    } catch (error) {
        outputText.value = `Error generating text file: ${error.message}\n\n` +
            "Please ensure:\n" +
            "1. You have selected at least one file from the directory structure.\n" +
            "2. Your access token (if provided) is valid and has the necessary permissions.\n" +
            "3. You have a stable internet connection.\n" +
            "4. The GitHub API is accessible and functioning normally.";
    } finally {
        // Hide loading overlay
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            loadingOverlay.style.opacity = '1';
        }, 300);
    }
});

// Event listener for downloading zip file
document.getElementById('downloadZipButton').addEventListener('click', async function () {
    const accessToken = document.getElementById('accessToken').value;

    try {
        const selectedFiles = getSelectedFiles();
        if (selectedFiles.length === 0) {
            throw new Error('No files selected');
        }
        const fileContents = await fetchFileContents(selectedFiles, accessToken);
        await createAndDownloadZip(fileContents);
    } catch (error) {
        const outputText = document.getElementById('outputText');
        outputText.value = `Error generating zip file: ${error.message}\n\n` +
            "Please ensure:\n" +
            "1. You have selected at least one file from the directory structure.\n" +
            "2. Your access token (if provided) is valid and has the necessary permissions.\n" +
            "3. You have a stable internet connection.\n" +
            "4. The GitHub API is accessible and functioning normally.";
    }
});

// Event listener for copying text to clipboard
document.getElementById('copyButton').addEventListener('click', function () {
    const outputText = document.getElementById('outputText');
    outputText.select();
    navigator.clipboard.writeText(outputText.value)
        .then(() => console.log('Text copied to clipboard'))
        .catch(err => console.error('Failed to copy text: ', err));
});

// Event listener for downloading text file
document.getElementById('downloadButton').addEventListener('click', async function () {
    const outputText = document.getElementById('outputText').value;
    if (!outputText.trim()) {
        document.getElementById('outputText').value = 'Error: No content to download. Please generate the text file first.';
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const repoName = getRepoNameFromUrl(tab.url);
        const fileName = `${repoName}_as_textprompt.txt`;
        
        const blob = new Blob([outputText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading file:', error);
        // Fallback to default name if there's an error
        const blob = new Blob([outputText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'repo_as_textprompt.txt';
        a.click();
        URL.revokeObjectURL(url);
    }
});

// Parse GitHub repository URL
function parseRepoUrl(url) {
    url = url.replace(/\/$/, '');
    const urlPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/tree\/(.+))?$/;
    const match = url.match(urlPattern);
    if (!match) {
        throw new Error('Invalid GitHub repository URL. Please ensure the URL is in the correct format: ' +
            'https://github.com/owner/repo or https://github.com/owner/repo/tree/branch/path');
    }
    return {
        owner: match[1],
        repo: match[2],
        lastString: match[4] || ''
    };
}

// Fetch repository references
async function getReferences(owner, repo, token) {
    const headers = {
        'Accept': 'application/vnd.github+json'
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    const [branchesResponse, tagsResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}/git/matching-refs/heads/`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/git/matching-refs/tags/`, { headers })
    ]);

    if (!branchesResponse.ok || !tagsResponse.ok) {
        throw new Error('Failed to fetch references');
    }

    const branches = await branchesResponse.json();
    const tags = await tagsResponse.json();

    return {
        branches: branches.map(b => b.ref.split("/").slice(2).join("/")),
        tags: tags.map(t => t.ref.split("/").slice(2).join("/"))
    };
}

// Fetch repository SHA
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
        handleFetchError(response);
    }
    const data = await response.json();
    return data.sha;
}

// Fetch repository tree
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
        handleFetchError(response);
    }
    const data = await response.json();
    return data.tree;
}

// Handle fetch errors
function handleFetchError(response) {
    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
        throw new Error('GitHub API rate limit exceeded. Please try again later or provide a valid access token to increase your rate limit.');
    }
    if (response.status === 404) {
        throw new Error(`Repository, branch, or path not found. Please check that the URL, branch/tag, and path are correct and accessible.`);
    }
    throw new Error(`Failed to fetch repository data. Status: ${response.status}. Please check your input and try again.`);
}

// Fetch contents of selected files
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
            handleFetchError(response);
        }
        const text = await response.text();
        return { url: file.url, path: file.path, text };
    }));
    return contents;
}

function setupShowMoreInfoButton() {
    const showMoreInfoButton = document.getElementById('showMoreInfo');
    const tokenInfo = document.getElementById('tokenInfo');

    showMoreInfoButton.addEventListener('click', function() {
        tokenInfo.classList.toggle('hidden');
        updateInfoIcon(this, tokenInfo);
    });
}

function updateInfoIcon(button, tokenInfo) {
    const icon = button.querySelector('[data-lucide]');
    if (icon) {
        icon.setAttribute('data-lucide', tokenInfo.classList.contains('hidden') ? 'info' : 'x');
        lucide.createIcons();
    }
}

// Create and download zip file
async function createAndDownloadZip(fileContents) {
    const zip = new JSZip();

    fileContents.forEach(file => {
        // Remove leading slash if present
        const filePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
        zip.file(filePath, file.text);
    });

    const content = await zip.generateAsync({type: "blob"});
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'partial_repo.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function setupTokenInput() {
    const tokenLabel = document.querySelector('.form-label');
    const infoButton = document.getElementById('showMoreInfo');
    const tokenInput = document.getElementById('accessToken');
    const tokenInfo = document.getElementById('tokenInfo');
    const tokenContainer = document.querySelector('.form-group');

    // Initially hide the input and info
    tokenInput.style.display = 'none';
    tokenInfo.style.display = 'none';

    // Function to toggle token input visibility
    function toggleTokenInput(event) {
        event.preventDefault();
        event.stopPropagation();
        const isVisible = tokenInput.style.display === 'block';
        
        // Toggle visibility
        tokenInput.style.display = isVisible ? 'none' : 'block';
        tokenInfo.style.display = isVisible ? 'none' : 'block';
        
        // Update icon
        const icon = infoButton.querySelector('[data-lucide]');
        if (icon) {
            const newIcon = document.createElement('i');
            newIcon.setAttribute('data-lucide', isVisible ? 'chevron-down' : 'chevron-up');
            newIcon.className = 'w-4 h-4';
            icon.parentNode.replaceChild(newIcon, icon);
            lucide.createIcons();
        }
    }

    // Add click handlers
    tokenLabel.style.cursor = 'pointer';
    tokenLabel.addEventListener('click', toggleTokenInput);
    infoButton.addEventListener('click', toggleTokenInput);

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!tokenContainer.contains(e.target)) {
            tokenInput.style.display = 'none';
            tokenInfo.style.display = 'none';
            
            // Update icon
            const icon = infoButton.querySelector('[data-lucide]');
            if (icon) {
                const newIcon = document.createElement('i');
                newIcon.setAttribute('data-lucide', 'chevron-down');
                newIcon.className = 'w-4 h-4';
                icon.parentNode.replaceChild(newIcon, icon);
                lucide.createIcons();
            }
        }
    });
}

// Add this function to clean GitHub URLs
function cleanGithubUrl(url) {
    try {
        // Remove any trailing slashes
        url = url.replace(/\/+$/, '');
        
        // Create URL object for easier parsing
        const urlObj = new URL(url);
        
        // Get the pathname without query parameters or hash
        let path = urlObj.pathname;
        
        // Remove common GitHub suffixes
        path = path
            .replace(/\/(tree|blob)\/[^\/]+\/.*$/, '') // Remove tree/blob paths
            .replace(/\?.*$/, '')                      // Remove query parameters
            .replace(/#.*$/, '')                       // Remove hash
            .replace(/\/pulls.*$/, '')                 // Remove pulls section
            .replace(/\/issues.*$/, '')                // Remove issues section
            .replace(/\/commits.*$/, '')               // Remove commits section
            .replace(/\/releases.*$/, '')              // Remove releases section
            .replace(/\/tags.*$/, '')                  // Remove tags section
            .replace(/\/actions.*$/, '')               // Remove actions section
            .replace(/\/projects.*$/, '')              // Remove projects section
            .replace(/\/wiki.*$/, '')                  // Remove wiki section
            .replace(/\/security.*$/, '')              // Remove security section
            .replace(/\/pulse.*$/, '')                 // Remove pulse section
            .replace(/\/(tab|readme).*$/, '');         // Remove tab parameters

        // Reconstruct the base repository URL
        return `https://github.com${path}`;
    } catch (error) {
        return url; // Return original URL if parsing fails
    }
}

// Update isValidGithubRepo to use the cleaned URL
function isValidGithubRepo(url) {
    try {
        const cleanedUrl = cleanGithubUrl(url);
        const parts = new URL(cleanedUrl).pathname.split('/').filter(Boolean);
        return parts.length >= 2; // Need at least owner and repo
    } catch (error) {
        return false;
    }
}

// Add this function to update header background
function updateHeaderStatus(isValid) {
    const header = document.querySelector('.header');
    const headerIcons = header.querySelectorAll('.header-actions i');
    
    if (isValid) {
        header.classList.add('valid-repo');
        header.classList.remove('invalid-repo');
        // Update icon colors to match header text color
        headerIcons.forEach(icon => {
            icon.style.color = document.documentElement.getAttribute('data-theme') === 'dark' 
                ? 'var(--dark-valid-repo-text)' 
                : 'var(--valid-repo-text)';
        });
    } else {
        header.classList.add('invalid-repo');
        header.classList.remove('valid-repo');
        // Update icon colors to match header text color
        headerIcons.forEach(icon => {
            icon.style.color = document.documentElement.getAttribute('data-theme') === 'dark' 
                ? 'var(--dark-invalid-repo-text)' 
                : 'var(--invalid-repo-text)';
        });
    }
}

// Add theme toggle functionality
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme
    document.documentElement.setAttribute('data-theme', 
        localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light'));
    
    // Update icon based on current theme
    updateThemeIcon();

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        updateThemeIcon();
    });
}

function updateThemeIcon() {
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    if (icon) {
        const newIcon = document.createElement('i');
        newIcon.setAttribute('data-lucide', currentTheme === 'dark' ? 'sun' : 'moon');
        newIcon.className = 'w-5 h-5';
        icon.parentNode.replaceChild(newIcon, icon);
        lucide.createIcons();
    }
}

// Add this helper function near the top of the file
function getRepoNameFromUrl(url) {
    try {
        const cleanedUrl = cleanGithubUrl(url);
        const parts = new URL(cleanedUrl).pathname.split('/').filter(Boolean);
        return parts.length >= 2 ? parts[1] : 'repo';
    } catch (error) {
        return 'repo';
    }
}
