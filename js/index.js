import { displayDirectoryStructure, sortContents, getSelectedFiles, formatRepoContents } from './utils.js';

let repoInfo = null; // Global variable to store repository information

// Event listener for form submission
document.getElementById('repoForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const repoUrl = document.getElementById('repoUrl').value;
  const accessToken = document.getElementById('accessToken').value;

  const outputText = document.getElementById('outputText');
  outputText.value = '';

  try {
    // Parse repository URL and fetch repository contents
    repoInfo = parseRepoUrl(repoUrl);
    const sha = await fetchRepoSha(repoInfo, accessToken);
    const tree = await fetchRepoTree(repoInfo, sha, accessToken);

    displayDirectoryStructure(tree);
    document.getElementById('generateTextButton').style.display = 'flex';
    document.getElementById('downloadZipButton').style.display = 'flex';
  } catch (error) {
    outputText.value = `Error fetching repository contents: ${error.message}\n\n` +
      "Please ensure:\n" +
      "1. The repository URL is correct and accessible.\n" +
      "2. You have the necessary permissions to access the repository.\n" +
      "3. If it's a private repository, you've provided a valid access token.\n" +
      "4. The specified branch/tag and path (if any) exist in the repository.";
  }
});

// Event listener for generating text file
document.getElementById('generateTextButton').addEventListener('click', async function () {
  const accessToken = document.getElementById('accessToken').value;
  const outputText = document.getElementById('outputText');
  outputText.value = '';

  try {
    const selectedFiles = getSelectedFiles();
    if (selectedFiles.length === 0) {
      throw new Error('No files selected');
    }
    const fileContents = await fetchFileContents(selectedFiles, repoInfo, accessToken);
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
      "4. The API is accessible and functioning normally.";
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
    const fileContents = await fetchFileContents(selectedFiles, repoInfo, accessToken);
    await createAndDownloadZip(fileContents);
  } catch (error) {
    const outputText = document.getElementById('outputText');
    outputText.value = `Error generating zip file: ${error.message}\n\n` +
      "Please ensure:\n" +
      "1. You have selected at least one file from the directory structure.\n" +
      "2. Your access token (if provided) is valid and has the necessary permissions.\n" +
      "3. You have a stable internet connection.\n" +
      "4. The API is accessible and functioning normally.";
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

// Parse repository URL for GitHub and Azure DevOps
function parseRepoUrl(url) {
  url = url.replace(/\/$/, '');

  let provider;
  let match;

  // GitHub URL pattern
  const githubPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/tree\/([^\/]+)(\/(.+))?)?$/;
  match = url.match(githubPattern);
  if (match) {
    provider = 'github';
    return {
      provider,
      owner: match[1],
      repo: match[2],
      refFromUrl: match[4],
      pathFromUrl: match[6]
    };
  }

  // Azure DevOps URL pattern
  const azurePattern = /^https:\/\/dev\.azure\.com\/([^\/]+)\/([^\/]+)\/_git\/([^\/]+)(\/)?(\?path=(.+)&version=(.+))?$/;
  match = url.match(azurePattern);
  if (match) {
    provider = 'azure';
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const pathFromUrl = queryParams.get('path');
    const refFromUrl = queryParams.get('version') ? queryParams.get('version').replace('GB', '') : null;
    return {
      provider,
      organization: match[1],
      project: match[2],
      repository: match[3],
      pathFromUrl,
      refFromUrl
    };
  }

  // Alternative Azure DevOps URL pattern
  const azureAltPattern = /^https:\/\/([^\.]+)\.visualstudio\.com\/([^\/]+)\/_git\/([^\/]+)(\/)?(\?path=(.+)&version=(.+))?$/;
  match = url.match(azureAltPattern);
  if (match) {
    provider = 'azure';
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const pathFromUrl = queryParams.get('path');
    const refFromUrl = queryParams.get('version') ? queryParams.get('version').replace('GB', '') : null;
    return {
      provider,
      organization: match[1],
      project: match[2],
      repository: match[3],
      pathFromUrl,
      refFromUrl
    };
  }

  throw new Error('Invalid repository URL. Please ensure the URL is in the correct format for GitHub or Azure DevOps.');
}

// Fetch repository SHA or equivalent
async function fetchRepoSha(repoInfo, token) {
  if (repoInfo.provider === 'github') {
    const { owner, repo, refFromUrl: ref, pathFromUrl: path } = repoInfo;
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
  } else if (repoInfo.provider === 'azure') {
    // Azure DevOps doesn't require SHA; return null
    return null;
  } else {
    throw new Error('Unsupported provider');
  }
}

// Fetch repository tree
async function fetchRepoTree(repoInfo, sha, token) {
  if (repoInfo.provider === 'github') {
    const { owner, repo } = repoInfo;
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
    return data.tree.map(item => ({
      path: item.path,
      type: item.type,
      url: item.url,
      provider: 'github'
    }));
  } else if (repoInfo.provider === 'azure') {
    const { organization, project, repository, refFromUrl: ref, pathFromUrl: path } = repoInfo;
    const apiVersion = '6.0';
    const encodedPath = encodeURIComponent(path || '/');
    const refParam = ref ? `&versionDescriptor.version=${ref}` : '';
    const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repository}/items?scopePath=${encodedPath}&recursionLevel=Full&includeContentMetadata=true&latestProcessedChange=true&api-version=${apiVersion}${refParam}`;
    const headers = {};
    if (token) {
      headers['Authorization'] = `Basic ${btoa(':' + token)}`; // Azure DevOps uses basic auth with PAT
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      handleFetchError(response);
    }
    const data = await response.json();
    const tree = data.value.map(item => {
      return {
        path: item.path.substring(1), // Remove leading '/'
        type: item.isFolder ? 'tree' : 'blob',
        url: item.url,
        provider: 'azure'
      };
    });
    return tree;
  } else {
    throw new Error('Unsupported provider');
  }
}

// Handle fetch errors
function handleFetchError(response) {
  if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
    throw new Error('API rate limit exceeded. Please try again later or provide a valid access token to increase your rate limit.');
  }
  if (response.status === 404) {
    throw new Error(`Repository, branch, or path not found. Please check that the URL, branch/tag, and path are correct and accessible.`);
  }
  throw new Error(`Failed to fetch repository data. Status: ${response.status}. Please check your input and try again.`);
}

// Fetch contents of selected files
async function fetchFileContents(files, repoInfo, token) {
  const contents = await Promise.all(files.map(async file => {
    let response;
    if (file.provider === 'github') {
      const headers = {
        'Accept': 'application/vnd.github.v3.raw'
      };
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }
      response = await fetch(file.url, { headers });
    } else if (file.provider === 'azure') {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Basic ${btoa(':' + token)}`;
      }
      const { organization, project, repository } = repoInfo;
      const apiVersion = '6.0';
      const encodedPath = encodeURIComponent('/' + file.path);
      const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repository}/items?path=${encodedPath}&api-version=${apiVersion}`;
      response = await fetch(url, { headers });
    } else {
      throw new Error('Unsupported provider');
    }

    if (!response.ok) {
      handleFetchError(response);
    }
    const text = await response.text();
    return { url: file.url, path: file.path, text };
  }));
  return contents;
}

// Initialize Lucide icons and set up event listeners
document.addEventListener('DOMContentLoaded', function () {
  lucide.createIcons();
  setupShowMoreInfoButton();
});

function setupShowMoreInfoButton() {
  const showMoreInfoButton = document.getElementById('showMoreInfo');
  const tokenInfo = document.getElementById('tokenInfo');

  showMoreInfoButton.addEventListener('click', function () {
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

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'partial_repo.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
