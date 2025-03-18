// URL validation regex
const URL_REGEX = /(?:https?:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[\w-]+)*\/?/;

// Validate and format URL
function validateUrl(url) {
    if (!url) {
        return null;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    if (!URL_REGEX.test(url)) {
        return null;
    }

    return url;
}

// Extract site name from URL for filename
function getSiteName(url) {
    try {
        const urlObj = new URL(url);
        const siteName = urlObj.hostname.split('.')[0];  // Simpler extraction
        return siteName;
    } catch (e) {
        return 'webpage';
    }
}

// Apply filters to markdown content
function applyFilters(markdown) {
    const includeImages = document.getElementById('includeImages').checked;
    const includeLinks = document.getElementById('includeLinks').checked;
    const includeCodeBlocks = document.getElementById('includeCodeBlocks').checked;
    const includeHeadings = document.getElementById('includeHeadings').checked;
    const includeTables = document.getElementById('includeTables').checked;
    const stripLineBreaks = document.getElementById('stripLineBreaks').checked;
    
    let filteredMarkdown = markdown;
    
    // Apply filters based on user settings
    if (!includeImages) {
        // Remove image markdown syntax
        filteredMarkdown = filteredMarkdown.replace(/!\[.*?\]\(.*?\)/g, '');
    }
    
    if (!includeLinks) {
        // Replace links with just their text content
        filteredMarkdown = filteredMarkdown.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    }
    
    if (!includeCodeBlocks) {
        // Remove code blocks
        filteredMarkdown = filteredMarkdown.replace(/```[\s\S]*?```/g, '');
        // Remove inline code
        filteredMarkdown = filteredMarkdown.replace(/`([^`]+)`/g, '$1');
    }
    
    if (!includeHeadings) {
        // Remove headings but keep the text
        filteredMarkdown = filteredMarkdown.replace(/^#+\s+(.*?)$/gm, '$1');
    }
    
    if (!includeTables) {
        // Remove markdown tables
        filteredMarkdown = filteredMarkdown.replace(/\|.*\|[\s\S]*?\n\|[-:|\s]*\|[\s\S]*?(?=\n\n|\n$|$)/g, '');
    }
    
    if (stripLineBreaks) {
        // Remove excessive line breaks
        filteredMarkdown = filteredMarkdown.replace(/\n{3,}/g, '\n\n');
    }
    
    return filteredMarkdown;
}

// Convert webpage to markdown using jina.ai service
async function convertToMarkdown(url) {
    try {
        const validUrl = validateUrl(url);
        if (!validUrl) {
            throw new Error("Invalid URL format. Please enter a valid web address.");
        }

        const jinaUrl = `https://r.jina.ai/${validUrl}`;
        const response = await fetch(jinaUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch content: ${response.statusText}`);
        }

        const markdownContent = await response.text();
        const filteredMarkdown = applyFilters(markdownContent);
        const siteName = getSiteName(validUrl);
        const filename = `${siteName}.md`;

        return {
            markdown: filteredMarkdown,
            filename: filename
        };
    } catch (e) {
        throw new Error(e.message);
    }
}

// Download markdown as a file
function downloadMarkdown(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Handle theme toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const moonIcon = document.querySelector('.moon-icon');
    const sunIcon = document.querySelector('.sun-icon');

    // Check for saved theme preference
    const currentTheme = localStorage.getItem('theme') || 'light'; // Default to light
    setTheme(currentTheme);

    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme); // Save preference
        moonIcon.style.display = theme === 'light' ? 'block' : 'none';
        sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
    }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Alt+U: Focus URL input
        if (e.altKey && e.key === 'u') {
            e.preventDefault();
            document.getElementById('url').focus();
        }
        
        // Ctrl+Enter: Convert to markdown
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('convertBtn').click();
        }
        
        // Ctrl+S: Download markdown when available
        if (e.ctrlKey && e.key === 's' && document.getElementById('previewContainer').style.display === 'block') {
            e.preventDefault();
            document.getElementById('downloadButton').click();
        }
        
        // Ctrl+C: Copy to clipboard when in results view
        if (e.ctrlKey && e.key === 'c' && document.getElementById('previewContainer').style.display === 'block' && 
            !window.getSelection().toString()) { // Only if no text is selected
            e.preventDefault();
            document.getElementById('copyButton').click();
        }
        
        // Ctrl+N: New conversion (clear and focus input)
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            document.getElementById('url').value = '';
            document.getElementById('url').focus();
            hidePreview();
        }
        
        // Shift+D: Toggle dark/light mode
        if (e.shiftKey && e.key === 'D') {
            e.preventDefault();
            document.getElementById('themeToggle').click();
        }
        
        // Escape: Clear input field
        if (e.key === 'Escape') {
            e.preventDefault();
            document.getElementById('clearButton').click();
        }
        
        // ?: Show keyboard shortcuts
        if (e.key === '?') {
            e.preventDefault();
            toggleShortcutsDisplay();
        }
    });
}

// Toggle shortcuts display
function toggleShortcutsDisplay() {
    const shortcutsContainer = document.getElementById('shortcutsContainer');
    const isVisible = shortcutsContainer.style.display === 'block';
    shortcutsContainer.style.display = isVisible ? 'none' : 'block';
}

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // DOM element references
    const urlInput = document.getElementById('url');
    const convertBtn = document.getElementById('convertBtn');
    const pasteBtn = document.getElementById('pasteButton');
    const clearBtn = document.getElementById('clearButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const previewContainer = document.getElementById('previewContainer');
    const markdownContent = document.getElementById('markdownContent');
    const copyBtn = document.getElementById('copyButton');
    const downloadBtn = document.getElementById('downloadButton');
    const copySuccess = document.getElementById('copySuccess');
    const renderedMarkdown = document.getElementById('renderedMarkdown');
    const newConversionBtn = document.getElementById('newConversionBtn');
    const filterToggle = document.getElementById('filterToggle');
    const filterOptions = document.getElementById('filterOptions');
    const showShortcutsBtn = document.getElementById('showShortcutsBtn');
    const shortcutsContainer = document.getElementById('shortcutsContainer');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Initialize theme toggle
    initThemeToggle();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    // Toggle filter options visibility
    filterToggle.addEventListener('click', () => {
        filterToggle.classList.toggle('collapsed');
        filterOptions.classList.toggle('collapsed');
    });

    // --- Event Listeners ---

    // Paste Button
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            urlInput.value = text;
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            showError("Failed to paste from clipboard. Please check permissions.");
        }
    });

    // Clear Button
    clearBtn.addEventListener('click', () => {
        urlInput.value = '';
        hideError();
        hidePreview();
    });

    // Show Shortcuts Button
    showShortcutsBtn.addEventListener('click', toggleShortcutsDisplay);

    // New Conversion Button
    newConversionBtn.addEventListener('click', () => {
        urlInput.value = '';
        hidePreview();
        urlInput.focus();
    });

    // Convert Button
    convertBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        hideError();
        hidePreview();
        showLoading(true);

        try {
            const result = await convertToMarkdown(url);
            markdownContent.value = result.markdown;
            showPreview();
            renderMarkdown(result.markdown); // Render the markdown

            // Set up download button with correct filename
            downloadBtn.onclick = () => downloadMarkdown(result.markdown, result.filename);

        } catch (err) {
            showError(err.message);
        } finally {
            showLoading(false);
        }
    });

    // Copy Button
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(markdownContent.value)
            .then(() => {
                copySuccess.style.display = 'block';
                setTimeout(() => copySuccess.style.display = 'none', 3000); // Hide after 3 seconds
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
                showError("Failed to copy to clipboard.");
            });
    });

    // Tab Switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;

            // Deactivate all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Activate clicked button and corresponding pane
            button.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });

    // Filter changes trigger preview update
    document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // If we have markdown content and preview is visible, update it
            if (markdownContent.value && previewContainer.style.display === 'block') {
                const filteredMarkdown = applyFilters(markdownContent.value);
                markdownContent.value = filteredMarkdown;
                renderMarkdown(filteredMarkdown);
            }
        });
    });

    // --- Helper Functions ---

    function showLoading(show) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function showPreview() {
        previewContainer.style.display = 'block';
    }

    function hidePreview() {
        previewContainer.style.display = 'none';
    }

    // Function to render Markdown using Marked.js and highlight code with Highlight.js
    function renderMarkdown(markdown) {
        renderedMarkdown.innerHTML = marked.parse(markdown);
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }
});

