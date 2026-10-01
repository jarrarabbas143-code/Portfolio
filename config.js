/**
 * MapRank Agency — Configuration & API Endpoint Settings
 */

const CONFIG = {
  // Agency Core Details
  AGENCY_NAME: 'MapRank',
  AGENCY_TAGLINE: 'GMB & Local SEO Agency',
  FOUNDER_NAME: 'Arsalan Abbas',
  WHATSAPP_NUMBER: '+92 311 8356461',
  WHATSAPP_RAW: '923118356461',
  PRIMARY_EMAIL: 'abbasarsalan462@gmail.com',
  DEFAULT_WHATSAPP_MESSAGE: 'Hello Arsalan, I would like to discuss GMB & Local SEO services for my business.',

  // Social Links
  SOCIAL: {
    INSTAGRAM: 'https://instagram.com/map_raink',
    FACEBOOK: 'https://facebook.com/MapRaink',
    WHATSAPP: 'https://wa.me/923118356461'
  },

  // API Configuration
  // When running locally, it points to local Node.js server.
  // When deployed on Netlify, update this to your deployed backend URL (e.g. Render / Railway)
  // or use the Netlify /api redirect rule configured in _redirects
  getApiBaseUrl() {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.protocol === 'file:';
    
    if (isLocal) {
      return 'http://localhost:5000/api';
    }
    
    // In production on Netlify, if custom backend is configured in window.MAPRANK_API_URL
    if (window.MAPRANK_API_URL) {
      return window.MAPRANK_API_URL;
    }
    
    // Default fallback: relative API path (can be proxied via Netlify _redirects)
    return '/api';
  }
};

window.CONFIG = CONFIG;
