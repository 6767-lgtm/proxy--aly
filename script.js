// State Management
let navigationHistory = [];
let navigationIndex = -1;
let bookmarks = [];
let history = [];
let preferences = {
    darkMode: false,
    trackHistory: true,
    enableBookmarks: true,
    customProxy: ''
};

// Proxy URLs
const proxyServices = {
    corsproxy: 'https://corsproxy.org/?',
    allorigins: 'https://api.allorigins.win/get?url=',
    'api-allorigins': 'https://api.allorigins.win/raw?url='
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadPreferences();
    loadBookmarks();
    loadHistory();
    renderBookmarks();
    renderHistory();
    applyPreferences();
    
    // Allow Enter key to launch proxy
    document.getElementById('urlInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') launchProxy();
    });
});

// Launch Proxy
function launchProxy() {
    const inputUrl = document.getElementById('urlInput').value;
    const viewer = document.getElementById('viewer');
    
    if (!inputUrl.trim()) {
        updateStatus('❌ Please enter a URL', 'error');
        return;
    }

    updateStatus('⏳ Loading...', 'loading');
    showLoadingSpinner(true);

    // Clean up the URL input
    let cleanUrl = inputUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
    }

    // Get selected proxy
    const proxyType = document.getElementById('proxySelect').value;
    const customProxy = document.getElementById('customProxy').value;
    
    let proxyUrl = customProxy || proxyServices[proxyType];
    
    if (!proxyUrl) {
        updateStatus('❌ Invalid proxy selected', 'error');
        showLoadingSpinner(false);
        return;
    }

    // Combine proxy and URL
    const fullUrl = proxyUrl + encodeURIComponent(cleanUrl);

    // Add to navigation history
    addToNavigationHistory(cleanUrl);
    
    // Add to history tracking
    if (preferences.trackHistory) {
        addToHistory(cleanUrl);
    }

    // Load into iframe
    viewer.src = fullUrl;
    viewer.classList.add('active');

    viewer.onload = function() {
        updateStatus('✓ Loaded successfully', 'success');
        showLoadingSpinner(false);
    };

    viewer.onerror = function() {
        updateStatus('❌ Failed to load. Try a different proxy.', 'error');
        showLoadingSpinner(false);
    };

    // Set timeout for loading
    setTimeout(() => {
        if (viewer.src === fullUrl) {
            updateStatus('�� Page loaded', 'success');
            showLoadingSpinner(false);
        }
    }, 3000);
}

// Copy URL to Clipboard
function copyURL() {
    const url = document.getElementById('urlInput').value;
    if (!url.trim()) {
        updateStatus('❌ No URL to copy', 'error');
        return;
    }
    
    navigator.clipboard.writeText(url).then(() => {
        updateStatus('✓ URL copied to clipboard!', 'success');
    }).catch(() => {
        updateStatus('❌ Failed to copy URL', 'error');
    });
}

// Navigation History Management
function addToNavigationHistory(url) {
    navigationIndex++;
    navigationHistory = navigationHistory.slice(0, navigationIndex);
    navigationHistory.push(url);
}

function goBack() {
    if (navigationIndex > 0) {
        navigationIndex--;
        const previousUrl = navigationHistory[navigationIndex];
        document.getElementById('urlInput').value = previousUrl;
        launchProxy();
        updateStatus('⬅️ Going back...', 'info');
    } else {
        updateStatus('📌 No previous pages', 'info');
    }
}

function goForward() {
    if (navigationIndex < navigationHistory.length - 1) {
        navigationIndex++;
        const nextUrl = navigationHistory[navigationIndex];
        document.getElementById('urlInput').value = nextUrl;
        launchProxy();
        updateStatus('➡️ Going forward...', 'info');
    } else {
        updateStatus('📌 No next pages', 'info');
    }
}

function refreshProxy() {
    const viewer = document.getElementById('viewer');
    if (viewer.src) {
        updateStatus('🔄 Refreshing...', 'info');
        showLoadingSpinner(true);
        viewer.src = viewer.src;
    } else {
        updateStatus('❌ No page loaded', 'error');
    }
}

// Bookmark Management
function addBookmark() {
    const url = document.getElementById('urlInput').value;
    if (!url.trim()) {
        updateStatus('❌ Please load a page first', 'error');
        return;
    }

    if (bookmarks.some(b => b.url === url)) {
        updateStatus('⭐ Already bookmarked', 'info');
        return;
    }

    const title = prompt('Bookmark name:', new URL(url).hostname || 'Bookmark');
    if (title) {
        bookmarks.push({ url, title });
        saveBookmarks();
        renderBookmarks();
        updateStatus('⭐ Bookmarked!', 'success');
    }
}

function removeBookmark(index) {
    bookmarks.splice(index, 1);
    saveBookmarks();
    renderBookmarks();
    updateStatus('❌ Bookmark removed', 'info');
}

function renderBookmarks() {
    const bookmarksDiv = document.getElementById('bookmarks');
    bookmarksDiv.innerHTML = '';
    
    if (bookmarks.length === 0) {
        bookmarksDiv.innerHTML = '<p style="color: #888; font-size: 12px;">No bookmarks yet</p>';
        return;
    }

    bookmarks.forEach((bookmark, index) => {
        const div = document.createElement('div');
        div.className = 'bookmark-item';
        div.innerHTML = `
            <span onclick="loadBookmark(${index})" style="flex: 1; cursor: pointer;">${bookmark.title}</span>
            <button class="remove-btn" onclick="removeBookmark(${index})">✕</button>
        `;
        bookmarksDiv.appendChild(div);
    });
}

function loadBookmark(index) {
    document.getElementById('urlInput').value = bookmarks[index].url;
    launchProxy();
    updateStatus(`📂 Loaded: ${bookmarks[index].title}`, 'info');
}

// History Management
function addToHistory(url) {
    const timestamp = new Date().toLocaleTimeString();
    history.unshift({ url, timestamp });
    
    // Keep only last 20 items
    if (history.length > 20) {
        history.pop();
    }
    
    saveHistory();
    renderHistory();
}

function clearHistory() {
    if (confirm('Are you sure you want to clear browsing history?')) {
        history = [];
        saveHistory();
        renderHistory();
        updateStatus('🗑️ History cleared', 'info');
    }
}

function renderHistory() {
    const historyDiv = document.getElementById('history');
    historyDiv.innerHTML = '';
    
    if (history.length === 0) {
        historyDiv.innerHTML = '<p style="color: #888; font-size: 12px;">No history yet</p>';
        return;
    }

    history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const domain = new URL(item.url).hostname;
        div.innerHTML = `
            <span onclick="loadHistoryItem(${index})" style="flex: 1; cursor: pointer;">
                <strong>${domain}</strong><br>
                <small style="color: #888;">${item.timestamp}</small>
            </span>
            <button class="remove-btn" onclick="removeHistoryItem(${index})">✕</button>
        `;
        historyDiv.appendChild(div);
    });
}

function loadHistoryItem(index) {
    document.getElementById('urlInput').value = history[index].url;
    launchProxy();
}

function removeHistoryItem(index) {
    history.splice(index, 1);
    saveHistory();
    renderHistory();
}

// Settings Management
function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.toggle('active');
}

function toggleDarkMode() {
    preferences.darkMode = document.getElementById('darkMode').checked;
    document.body.classList.toggle('dark-mode', preferences.darkMode);
    savePreferences();
}

function toggleHistoryTracking() {
    preferences.trackHistory = document.getElementById('enableHistory').checked;
    savePreferences();
}

function applyPreferences() {
    document.getElementById('darkMode').checked = preferences.darkMode;
    document.getElementById('enableHistory').checked = preferences.trackHistory;
    document.getElementById('enableBookmarks').checked = preferences.enableBookmarks;
    document.getElementById('customProxy').value = preferences.customProxy || '';
    
    if (preferences.darkMode) {
        document.body.classList.add('dark-mode');
    }
}

function exportData() {
    const data = {
        bookmarks,
        history,
        preferences,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proxy-data-${Date.now()}.json`;
    link.click();
    
    updateStatus('📥 Data exported', 'success');
}

function importData() {
    document.getElementById('importFile').click();
}

function processImport() {
    const file = document.getElementById('importFile').files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.bookmarks) bookmarks = data.bookmarks;
            if (data.history) history = data.history;
            if (data.preferences) preferences = { ...preferences, ...data.preferences };
            
            saveBookmarks();
            saveHistory();
            savePreferences();
            renderBookmarks();
            renderHistory();
            applyPreferences();
            
            updateStatus('📤 Data imported successfully!', 'success');
        } catch (error) {
            updateStatus('❌ Import failed: Invalid file format', 'error');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    document.getElementById('importFile').value = '';
}

function resetAll() {
    if (confirm('This will delete ALL bookmarks, history, and settings. Are you sure?')) {
        bookmarks = [];
        history = [];
        navigationHistory = [];
        navigationIndex = -1;
        preferences = {
            darkMode: false,
            trackHistory: true,
            enableBookmarks: true,
            customProxy: ''
        };
        
        localStorage.clear();
        location.reload();
        updateStatus('🔄 Reset complete', 'success');
    }
}

// LocalStorage Management
function saveBookmarks() {
    localStorage.setItem('proxyBookmarks', JSON.stringify(bookmarks));
}

function loadBookmarks() {
    const saved = localStorage.getItem('proxyBookmarks');
    if (saved) {
        try {
            bookmarks = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load bookmarks:', e);
        }
    }
}

function saveHistory() {
    localStorage.setItem('proxyHistory', JSON.stringify(history));
}

function loadHistory() {
    const saved = localStorage.getItem('proxyHistory');
    if (saved) {
        try {
            history = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    }
}

function savePreferences() {
    preferences.customProxy = document.getElementById('customProxy').value;
    localStorage.setItem('proxyPreferences', JSON.stringify(preferences));
}

function loadPreferences() {
    const saved = localStorage.getItem('proxyPreferences');
    if (saved) {
        try {
            preferences = { ...preferences, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Failed to load preferences:', e);
        }
    }
}

// Status Update
function updateStatus(message, type = 'info') {
    const statusText = document.getElementById('statusText');
    statusText.textContent = message;
    statusText.style.color = type === 'error' ? '#ff4444' : type === 'success' ? '#00ff88' : '#00d4ff';
}

// Loading Spinner
function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'inline' : 'none';
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') {
            e.preventDefault();
            addBookmark();
        } else if (e.key === 's') {
            e.preventDefault();
            toggleSettings();
        } else if (e.key === 'l') {
            e.preventDefault();
            document.getElementById('urlInput').focus();
        } else if (e.key === 'c') {
            e.preventDefault();
            copyURL();
        }
    }
});