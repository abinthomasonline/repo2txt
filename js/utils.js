// Add this function at the beginning of the file
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

    // Hide initially after a short delay to ensure DOM is ready
    setTimeout(() => {
        tokenInput.style.display = 'none';
        tokenInfo.style.display = 'none';
    }, 0);
}

// Display directory structure
function displayDirectoryStructure(tree) {
    tree = tree.filter(item => item.type === 'blob').sort(sortContents);
    const container = document.getElementById('directoryStructure');
    container.innerHTML = '';
    const rootUl = document.createElement('ul');
    container.appendChild(rootUl);

    const commonExtensions = ['.js', '.py', '.java', '.cpp', '.html', '.css', '.ts', '.jsx', '.tsx'];
    const directoryStructure = {};
    const extensionCheckboxes = {};

    // Build directory structure
    tree.forEach(item => {
        item.path = item.path.startsWith('/') ? item.path : '/' + item.path;
        const pathParts = item.path.split('/');
        let currentLevel = directoryStructure;

        pathParts.forEach((part, index) => {
            part = part === '' ? './' : part;
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
        checkbox.className = 'mr-2';
        
        if (typeof item === 'object' && (!item.type || typeof item.type !== 'string')) {
            // Directory node
            createDirectoryNode(li, checkbox, name, item, parentUl);
        } else {
            // File node
            createFileNode(li, checkbox, name, item);
        }

        li.className = 'my-2';
        parentUl.appendChild(li);
        updateParentCheckbox(checkbox);
        updateExtensionCheckboxes();
    }

    function createDirectoryNode(li, checkbox, name, item, parentUl) {
        checkbox.classList.add('directory-checkbox');
        li.appendChild(checkbox);

        const collapseButton = createCollapseButton();
        li.appendChild(collapseButton);

        appendIcon(li, 'folder');
        li.appendChild(document.createTextNode(name));

        const ul = document.createElement('ul');
        ul.className = 'ml-6 mt-2';
        li.appendChild(ul);
        
        for (const [childName, childItem] of Object.entries(item)) {
            createTreeNode(childName, childItem, ul);
        }

        addDirectoryCheckboxListener(checkbox, li);
        addCollapseButtonListener(collapseButton, ul);
    }

    function createFileNode(li, checkbox, name, item) {
        checkbox.value = JSON.stringify({ url: item.url, path: item.path, urlType: item.urlType });
        
        const extension = name.split('.').pop().toLowerCase();
        const isCommonFile = commonExtensions.includes('.' + extension);
        checkbox.checked = isCommonFile;

        if (!(extension in extensionCheckboxes)) {
            extensionCheckboxes[extension] = {
                checkbox: createExtensionCheckbox(extension),
                children: []
            };
        }
        extensionCheckboxes[extension].children.push(checkbox);

        li.appendChild(checkbox);
        appendIcon(li, 'file');
        li.appendChild(document.createTextNode(name));
    }

    function createCollapseButton() {
        const collapseButton = document.createElement('button');
        collapseButton.innerHTML = '<i data-lucide="chevron-down" class="w-4 h-4"></i>';
        collapseButton.className = 'mr-1 focus:outline-none';
        return collapseButton;
    }

    function appendIcon(element, iconName) {
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', iconName);
        icon.className = 'inline-block w-4 h-4 mr-1';
        element.appendChild(icon);
    }

    function addDirectoryCheckboxListener(checkbox, li) {
        checkbox.addEventListener('change', function() {
            const childCheckboxes = li.querySelectorAll('input[type="checkbox"]');
            childCheckboxes.forEach(childBox => {
                childBox.checked = this.checked;
                childBox.indeterminate = false;
            });
        });
    }

    function addCollapseButtonListener(collapseButton, ul) {
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
    }

    function createExtensionCheckbox(extension) {
        const extCheckbox = document.createElement('input');
        extCheckbox.type = 'checkbox';
        extCheckbox.className = 'mr-1';
        extCheckbox.value = extension;
        return extCheckbox;
    }

    for (const [name, item] of Object.entries(directoryStructure)) {
        createTreeNode(name, item, rootUl);
    }

    createExtensionCheckboxesContainer();

    // Add event listener to container for checkbox changes
    container.addEventListener('change', function(event) {
        if (event.target.type === 'checkbox') {
            updateParentCheckbox(event.target);
            updateExtensionCheckboxes();
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

    function updateExtensionCheckboxes() {
        for (const [extension, checkbox] of Object.entries(extensionCheckboxes)) {
            const children = checkbox.children;
            const checkedCount = Array.from(children).filter(cb => cb.checked).length;

            if (checkedCount === 0) {
                checkbox.checkbox.checked = false;
                checkbox.checkbox.indeterminate = false;
            } else if (checkedCount === children.length) {
                checkbox.checkbox.checked = true;
                checkbox.checkbox.indeterminate = false;
            } else {
                checkbox.checkbox.checked = false;
                checkbox.checkbox.indeterminate = true;
            }
        }
    }

    function createExtensionCheckboxesContainer() {
        const extentionCheckboxesContainer = document.getElementById('extentionCheckboxes');
        extentionCheckboxesContainer.innerHTML = '';
        extentionCheckboxesContainer.className = 'extension-checkboxes';

        // Create header with label and toggle button
        const header = document.createElement('div');
        header.className = 'extension-header';
        
        const label = document.createElement('label');
        label.innerHTML = 'Filter by file extensions';
        label.className = 'form-label';
        
        // Create toggle button with icon
        const toggleButton = document.createElement('button');
        toggleButton.className = 'extension-toggle';
        toggleButton.type = 'button';
        toggleButton.innerHTML = `
            <span>Select Extensions</span>
            <span class="icon-container ml-2">
                <i data-lucide="chevron-down" class="w-4 h-4"></i>
            </span>
        `;
        
        header.appendChild(label);
        header.appendChild(toggleButton);
        extentionCheckboxesContainer.appendChild(header);

        // Create extension list container
        const listContainer = document.createElement('div');
        listContainer.className = 'extension-list';

        // Define media extensions
        const mediaExtensions = new Set([
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'svg', 'webp',  // Images
            'mp4', 'webm', 'mov', 'avi', 'wmv', 'flv', 'm4v',          // Videos
            'mp3', 'wav', 'ogg', 'm4a', 'aac',                         // Audio
            'ttf', 'otf', 'woff', 'woff2', 'eot',                      // Fonts
        ]);

        // Add "Select All" and "Select Non-Media" checkboxes
        const selectAllItem = document.createElement('div');
        selectAllItem.className = 'extension-item';
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'select-all-extensions';
        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = 'select-all-extensions';
        selectAllLabel.textContent = 'Select All';
        selectAllItem.appendChild(selectAllCheckbox);
        selectAllItem.appendChild(selectAllLabel);
        listContainer.appendChild(selectAllItem);

        // Add "Select Non-Media" option
        const selectNonMediaItem = document.createElement('div');
        selectNonMediaItem.className = 'extension-item';
        const selectNonMediaCheckbox = document.createElement('input');
        selectNonMediaCheckbox.type = 'checkbox';
        selectNonMediaCheckbox.id = 'select-non-media-extensions';
        const selectNonMediaLabel = document.createElement('label');
        selectNonMediaLabel.htmlFor = 'select-non-media-extensions';
        selectNonMediaLabel.textContent = 'Select Everything Non-Media';
        selectNonMediaItem.appendChild(selectNonMediaCheckbox);
        selectNonMediaItem.appendChild(selectNonMediaLabel);
        listContainer.appendChild(selectNonMediaItem);

        // Add divider
        const divider = document.createElement('div');
        divider.className = 'extension-divider';
        listContainer.appendChild(divider);

        // Sort extensions by frequency
        const sortedExtensions = Object.entries(extensionCheckboxes)
            .sort((a, b) => b[1].children.length - a[1].children.length);

        // Add extension checkboxes
        for (const [extension, checkbox] of sortedExtensions) {
            const item = document.createElement('div');
            item.className = 'extension-item';
            
            const extCheckbox = checkbox.checkbox;
            extCheckbox.style.margin = '0 8px 0 0';
            extCheckbox.id = `ext-${extension}`;  // Add ID for label association
            
            const label = document.createElement('label');
            label.htmlFor = `ext-${extension}`;  // Associate label with checkbox
            label.textContent = `.${extension} (${checkbox.children.length})`;
            label.style.flexGrow = '1';  // Make label take up remaining space
            label.style.cursor = 'pointer';  // Show pointer cursor
            
            item.appendChild(extCheckbox);
            item.appendChild(label);
            listContainer.appendChild(item);

            // Make the entire row clickable
            item.addEventListener('click', (e) => {
                // Prevent double-triggering when clicking the checkbox directly
                if (e.target !== extCheckbox) {
                    e.preventDefault();
                    extCheckbox.checked = !extCheckbox.checked;
                    
                    // Trigger change event
                    const changeEvent = new Event('change', { bubbles: true });
                    extCheckbox.dispatchEvent(changeEvent);
                }
            });

            // Update select all state when individual checkbox changes
            extCheckbox.addEventListener('change', function() {
                const children = checkbox.children;
                children.forEach(child => {
                    child.checked = this.checked;
                    child.indeterminate = false;
                    updateParentCheckbox(child);
                });
                updateSelectAllState();
            });
        }

        extentionCheckboxesContainer.appendChild(listContainer);

        // Toggle dropdown
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            listContainer.classList.toggle('show');
            
            // Update icon
            const icon = toggleButton.querySelector('[data-lucide]');
            if (icon) {
                const newIcon = document.createElement('i');
                newIcon.setAttribute('data-lucide', 
                    listContainer.classList.contains('show') ? 'chevron-up' : 'chevron-down');
                newIcon.className = 'w-4 h-4';
                icon.parentNode.replaceChild(newIcon, icon);
                lucide.createIcons();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!extentionCheckboxesContainer.contains(e.target)) {
                listContainer.classList.remove('show');
                
                // Update icon
                const icon = toggleButton.querySelector('[data-lucide]');
                if (icon) {
                    const newIcon = document.createElement('i');
                    newIcon.setAttribute('data-lucide', 'chevron-down');
                    newIcon.className = 'w-4 h-4';
                    icon.parentNode.replaceChild(newIcon, icon);
                    lucide.createIcons();
                }
            }
        });

        // Handle select all functionality
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            
            // Update all extension checkboxes in the dropdown
            const extensionCheckboxes = Array.from(listContainer.querySelectorAll('input[type="checkbox"]'))
                .filter(cb => cb !== selectAllCheckbox && cb !== selectNonMediaCheckbox);
            
            // Update extension checkboxes
            extensionCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                
                // Trigger change event
                const changeEvent = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
            });

            // Update all file checkboxes in the directory structure
            const allFileCheckboxes = document.querySelectorAll('#directoryStructure input[type="checkbox"]:not(.directory-checkbox)');
            allFileCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                updateParentCheckbox(checkbox);
            });

            // Update all directory checkboxes
            const allDirectoryCheckboxes = document.querySelectorAll('#directoryStructure .directory-checkbox');
            allDirectoryCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                checkbox.indeterminate = false;
            });

            // Force update the UI
            updateSelectAllState();
        });

        // Handle select non-media functionality
        selectNonMediaCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            
            // Update extension checkboxes
            const extensionCheckboxes = Array.from(listContainer.querySelectorAll('input[type="checkbox"]'))
                .filter(cb => cb !== selectAllCheckbox && cb !== selectNonMediaCheckbox);
            
            extensionCheckboxes.forEach(checkbox => {
                const extension = checkbox.value;
                const shouldCheck = isChecked && !mediaExtensions.has(extension);
                checkbox.checked = shouldCheck;
                
                // Trigger change event
                const changeEvent = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
            });

            // Update all file checkboxes in the directory structure
            const allFileCheckboxes = document.querySelectorAll('#directoryStructure input[type="checkbox"]:not(.directory-checkbox)');
            allFileCheckboxes.forEach(checkbox => {
                const fileExtension = checkbox.value && JSON.parse(checkbox.value).path.split('.').pop().toLowerCase();
                const shouldCheck = isChecked && !mediaExtensions.has(fileExtension);
                checkbox.checked = shouldCheck;
                updateParentCheckbox(checkbox);
            });

            // Update all directory checkboxes
            const allDirectoryCheckboxes = document.querySelectorAll('#directoryStructure .directory-checkbox');
            allDirectoryCheckboxes.forEach(checkbox => {
                checkbox.indeterminate = true;
                updateParentCheckbox(checkbox);
            });

            // Update select all checkbox state
            updateSelectAllState();
        });

        // Update the updateSelectAllState function to handle both checkboxes
        function updateSelectAllState() {
            const checkboxes = Array.from(listContainer.querySelectorAll('input[type="checkbox"]'))
                .filter(cb => cb !== selectAllCheckbox && cb !== selectNonMediaCheckbox);
            const checkedCount = checkboxes.filter(cb => cb.checked).length;
            
            selectAllCheckbox.checked = checkedCount === checkboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
            
            // Update non-media checkbox state
            const nonMediaBoxes = checkboxes.filter(cb => !mediaExtensions.has(cb.value));
            const checkedNonMedia = nonMediaBoxes.filter(cb => cb.checked).length;
            selectNonMediaCheckbox.checked = checkedNonMedia === nonMediaBoxes.length;
            selectNonMediaCheckbox.indeterminate = checkedNonMedia > 0 && checkedNonMedia < nonMediaBoxes.length;
        }

        // Initial select all state
        updateSelectAllState();

        // Create initial icons
        lucide.createIcons();
    }

    lucide.createIcons();
}

// Sort contents alphabetically and by directory/file
function sortContents(a, b) {
    if (!a || !b || !a.path || !b.path) return 0;
    
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
}

// Get selected files from the directory structure
function getSelectedFiles() {
    const checkboxes = document.querySelectorAll('#directoryStructure input[type="checkbox"]:checked:not(.directory-checkbox)');
    return Array.from(checkboxes).map(checkbox => JSON.parse(checkbox.value));
}

// Format repository contents into a single text
function formatRepoContents(contents) {
    let text = '';
    let index = '';
    const LINE_LIMIT = 500;
    let totalLineCount = 0;

    // Ensure contents is an array before sorting
    contents = Array.isArray(contents) ? contents.sort(sortContents) : [contents];

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

    // Build the index recursively
    function buildIndex(node, prefix = '') {
        let result = '';
        const entries = Object.entries(node);
        entries.forEach(([name, subNode], index) => {
            const isLastItem = index === entries.length - 1;
            const linePrefix = isLastItem ? '└── ' : '├── ';
            const childPrefix = isLastItem ? '    ' : '│   ';

            name = name === '' ? './' : name;

            result += `${prefix}${linePrefix}${name}\n`;
            if (subNode) {
                result += buildIndex(subNode, `${prefix}${childPrefix}`);
            }
        });
        return result;
    }

    index = buildIndex(tree);
    totalLineCount += index.split('\n').length;

    // Count total lines first
    let fullText = '';
    contents.forEach((item) => {
        fullText += `\n\n---\nFile: ${item.path}\n---\n\n${item.text}\n`;
    });
    
    const allLines = fullText.split('\n');
    totalLineCount += allLines.length;

    // Now build the truncated text
    let currentLineCount = index.split('\n').length;
    let truncatedText = '';
    
    for (const item of contents) {
        const itemText = `\n\n---\nFile: ${item.path}\n---\n\n${item.text}\n`;
        const itemLines = itemText.split('\n');
        
        if (currentLineCount + itemLines.length <= LINE_LIMIT) {
            truncatedText += itemText;
            currentLineCount += itemLines.length;
        } else {
            const remainingLines = LINE_LIMIT - currentLineCount;
            if (remainingLines > 0) {
                const truncatedItemLines = itemLines.slice(0, remainingLines);
                truncatedText += `\n\n---\nFile: ${item.path}\n---\n\n${truncatedItemLines.join('\n')}\n`;
            }
            break;
        }
    }

    // Add truncation notice if needed
    const remainingLines = totalLineCount - LINE_LIMIT;
    if (remainingLines > 0) {
        truncatedText += `\n\n---\nOutput truncated: ${remainingLines.toLocaleString()} more lines available---\n`;
    }

    let formattedText = `Directory Structure:\n\n${index}\n${truncatedText}`;
    let fullFormattedText = `Directory Structure:\n\n${index}\n${fullText}`;

    try {
        const { encode } = GPTTokenizer_o200k_base;
        console.log("encoder is loaded");
        // Count tokens for the full text
        const count = encode(fullFormattedText).length;
        console.log(count);
        
        // Add hover events to Copy and Download buttons
        const copyButton = document.getElementById('copyButton');
        const downloadButton = document.getElementById('downloadButton');
        const tooltipText = `Token Count: ${count.toLocaleString()}\nTokenizer: o200k_base (gpt-4o & o1)`;

        // Copy button tooltip
        copyButton.addEventListener('mouseenter', () => {
            const tooltip = document.createElement('div');
            tooltip.className = 'button-tooltip';
            tooltip.textContent = tooltipText;
            tooltip.style.whiteSpace = 'pre-line';
            tooltip.style.lineHeight = '1.5';
            copyButton.appendChild(tooltip);
        });
        
        copyButton.addEventListener('mouseleave', () => {
            const tooltip = copyButton.querySelector('.button-tooltip');
            if (tooltip) {
                copyButton.removeChild(tooltip);
            }
        });

        // Download button tooltip
        downloadButton.addEventListener('mouseenter', () => {
            const tooltip = document.createElement('div');
            tooltip.className = 'button-tooltip';
            tooltip.textContent = tooltipText;
            tooltip.style.whiteSpace = 'pre-line';
            downloadButton.appendChild(tooltip);
        });
        
        downloadButton.addEventListener('mouseleave', () => {
            const tooltip = downloadButton.querySelector('.button-tooltip');
            if (tooltip) {
                downloadButton.removeChild(tooltip);
            }
        });
    } catch (error) {
        console.log(error);
    }

    // Return both the truncated and full text
    return {
        truncatedText: formattedText,
        fullText: fullFormattedText
    };
}

export { displayDirectoryStructure, sortContents, getSelectedFiles, formatRepoContents, setupTokenInput };