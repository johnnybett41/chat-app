// Configuration file for API server URL
// Auto-detects environment and uses appropriate URL

const getApiUrl = () => {
    // If running on localhost, use local server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }
    
    // If running on production, use your deployed backend
    // Replace 'your-backend-name' with your actual Render backend name
    if (window.location.hostname.includes('onrender.com')) {
        return 'https://chat-app-backend.onrender.com'; // Update this with your actual URL
    }
    
    // Default fallback
    return 'http://localhost:5000';
};

const API_URL = getApiUrl();

console.log(`🚀 API Server: ${API_URL}`);
