// ========================================
// BACKEND API CONFIGURATION
// ========================================

const API_CONFIG = {
    BASE_URL: 'http://127.0.0.1:5000/api/login',
    TIMEOUT: 30000,
    HEADERS: {
        'Content-Type': 'application/json'
    }
};

// Global auth token
let authToken = sessionStorage.getItem('authToken');

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const config = {
        ...options,
        headers: {
            ...API_CONFIG.HEADERS,
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, redirect to login
                sessionStorage.clear();
                window.location.href = 'login.html';
                throw new Error('Session expired');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ========================================
// AUTH FUNCTIONS
// ========================================

async function loginUser(email, password) {
    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        // Store auth data
        authToken = data.token;
        sessionStorage.setItem('authToken', data.token);
        sessionStorage.setItem('userData', JSON.stringify({
            id: data.id,
            name: data.name,
            email: data.email,
            points: data.points
        }));
        sessionStorage.setItem('isLoggedIn', 'true');

        // Request notification permission
        if (window.pushNotificationService) {
            console.log("Requesting Permissions...");
            window.pushNotificationService.requestPermission();
        }

        showToast('Login successful! Welcome back.', 'success');
        
        // Redirect to main app
        setTimeout(() => {
            window.location.href = 'main-app.html';
        }, 1000);

        return data;
    } catch (error) {
        showToast('Login failed: ' + error.message, 'error');
        throw error;
    }
}

async function registerUser(name, email, password) {
    try {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        // Auto-login after registration
        authToken = data.token;
        sessionStorage.setItem('authToken', data.token);
        sessionStorage.setItem('userData', JSON.stringify({
            id: data.id,
            name: data.name,
            email: data.email,
            points: data.points
        }));
        sessionStorage.setItem('isLoggedIn', 'true');

        showToast('Registration successful!', 'success');
        
        setTimeout(() => {
            window.location.href = 'main-app.html';
        }, 1000);

        return data;
    } catch (error) {
        showToast('Registration failed: ' + error.message, 'error');
        throw error;
    }
}

// ========================================
// PANDAL FUNCTIONS (Updated)
// ========================================

async function loadPandalsFromBackend() {
    try {
        const pandals = await apiCall('/pandals', { method: 'GET' });
        return pandals;
    } catch (error) {
        console.error('Error loading pandals:', error);
        // Fallback to local data
        return pandalData;
    }
}

async function addBookmarkToBackend(pandalId) {
    try {
        await apiCall('/pandals/bookmark', {
            method: 'POST',
            body: JSON.stringify({ pandalId })
        });
        showToast('Bookmark added!', 'success');
    } catch (error) {
        showToast('Failed to add bookmark', 'error');
    }
}

async function removeBookmarkFromBackend(pandalId) {
    try {
        await apiCall(`/pandals/bookmark/${pandalId}`, {
            method: 'DELETE'
        });
        showToast('Bookmark removed!', 'info');
    } catch (error) {
        showToast('Failed to remove bookmark', 'error');
    }
}

async function markVisitedOnBackend(pandalId) {
    try {
        await apiCall('/pandals/visit', {
            method: 'POST',
            body: JSON.stringify({ pandalId })
        });
        showToast('Pandal marked as visited! +10 points', 'success');
    } catch (error) {
        showToast('Failed to mark visited', 'error');
    }
}

async function getUserBookmarksFromBackend() {
    try {
        const bookmarks = await apiCall('/pandals/bookmarks', { method: 'GET' });
        return bookmarks;
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        return [];
    }
}

async function getUserVisitedFromBackend() {
    try {
        const visited = await apiCall('/pandals/visited', { method: 'GET' });
        return visited;
    } catch (error) {
        console.error('Error loading visited pandals:', error);
        return [];
    }
}

// ========================================
// REVIEW FUNCTIONS
// ========================================

async function submitReviewToBackend(pandalId, rating, comment) {
    try {
        const review = await apiCall('/reviews', {
            method: 'POST',
            body: JSON.stringify({ pandalId, rating, comment })
        });
        showToast('Review submitted! +5 points', 'success');
        return review;
    } catch (error) {
        showToast('Failed to submit review', 'error');
        throw error;
    }
}

async function getReviewsFromBackend(pandalId) {
    try {
        const reviews = await apiCall(`/reviews/pandal/${pandalId}`, { method: 'GET' });
        return reviews;
    } catch (error) {
        console.error('Error loading reviews:', error);
        return [];
    }
}

// ========================================
// UPDATE EXISTING FUNCTIONS
// ========================================

// Modify your existing toggleBookmark function
async function toggleBookmark(pandalId) {
    const index = appState.bookmarked.indexOf(pandalId);
    
    if (index > -1) {
        // Remove bookmark
        appState.bookmarked.splice(index, 1);
        await removeBookmarkFromBackend(pandalId);
    } else {
        // Add bookmark
        appState.bookmarked.push(pandalId);
        await addBookmarkToBackend(pandalId);
    }
    
    appState.save();
    generatePandalCards();
    updateStats();
}

// Modify your existing markVisited function
async function markVisited(pandalId) {
    if (!appState.visited.includes(pandalId)) {
        appState.visited.push(pandalId);
        
        // Save to backend
        await markVisitedOnBackend(pandalId);
        
        appState.save();
        generatePandalCards();
        updateProgress();
        updateStats();
        checkAchievements();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    authToken = sessionStorage.getItem('authToken');
    
    if (isLoggedIn && authToken) {
        // Load user data from backend
        try {
            const bookmarks = await getUserBookmarksFromBackend();
            const visited = await getUserVisitedFromBackend();
            
            // Update local state
            appState.bookmarked = bookmarks.map(p => p.id);
            appState.visited = visited.map(p => p.id);
            appState.save();
        } catch (error) {
            console.error('Error syncing with backend:', error);
        }
    }
    
    // Continue with normal initialization
    initializeApp();
});