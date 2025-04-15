/**
 * Google Apps Script Connector for BBOP Dashboard
 * 
 * This script connects to your Google Apps Script web app 
 * and fetches BBOP transcript data for the dashboard.
 */

// Configuration
const CONFIG = {
  // Your Google Apps Script Web App URL - UPDATE THIS with your latest deployment URL
  WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbw4ypYFnpm_l7ClmIEwOyb6MJkSR4YXiKfhobfbEkDS_YwXaCbm2aSrIbuHUJrcTYC4Xg/exec',
  
  // How often to refresh data (in milliseconds)
  REFRESH_INTERVAL: 60000 // 1 minute
};

// Store for our dashboard data
let dashboardData = {
  conversations: [],
  students: {}
};

/**
 * Fetch data from the Google Apps Script web app
 * @param {Object} filters - Optional filters to apply (studentID, date)
 * @returns {Promise} Promise resolving to the processed data
 */
function fetchData(filters = {}) {
  console.log('Fetching data with filters:', filters);
  
  // Build URL with any filters
  let url = CONFIG.WEBAPP_URL;
  
  // Add filters as query parameters if provided
  const params = new URLSearchParams();
  if (filters.studentID) params.append('studentID', filters.studentID);
  if (filters.date) params.append('date', filters.date);
  
  // Append query string if we have parameters
  if (params.toString()) {
    url += '?' + params.toString();
  }
  
  // Add cache-busting parameter to prevent browser caching
  url += (url.includes('?') ? '&' : '?') + 'cacheBust=' + new Date().getTime();
  
  console.log('Fetching from URL:', url);
  
  // Fetch data from the web app with JSONP approach to avoid CORS issues
  return new Promise((resolve, reject) => {
    try {
      // First try with regular fetch with credentials included
      fetch(url, {
        method: 'GET',
        credentials: 'include',  // Include credentials for cross-origin requests
        headers: {
          'Accept': 'application/json'
        }
      })
      .then(response => {
        if (!response.ok) {
          console.error('Server response not OK:', response.status, response.statusText);
          throw new Error('Network response was not ok: ' + response.statusText);
        }
        return response.json();
      })
      .then(data => {
        console.log('Data fetched successfully:', data);
        
        // Update the global dashboardData
        dashboardData = data;
        
        resolve(data);
      })
      .catch(error => {
        console.error('Error with primary fetch method:', error);
        
        // Instead of just failing, try with a JSONP approach as fallback
        const script = document.createElement('script');
        const callbackName = 'jsonpCallback_' + Math.round(Math.random() * 1000000);
        
        // Define the callback function
        window[callbackName] = function(data) {
          console.log('Data fetched via JSONP:', data);
          
          // Update the global dashboardData
          dashboardData = data;
          
          // Clean up
          delete window[callbackName];
          document.body.removeChild(script);
          
          resolve(data);
        };
        
        // Add callback parameter to URL
        const jsonpUrl = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        
        // Set up error handling
        script.onerror = function() {
          console.error('JSONP request failed');
          delete window[callbackName];
          document.body.removeChild(script);
          
          // Try one more fallback - using a proxy service if available
          const proxyUrl = 'https://cors-anywhere.herokuapp.com/' + url;
          console.log('Trying proxy URL:', proxyUrl);
          
          fetch(proxyUrl)
            .then(response => response.json())
            .then(data => {
              console.log('Data fetched via proxy:', data);
              dashboardData = data;
              resolve(data);
            })
            .catch(finalError => {
              console.error('All fetch methods failed:', finalError);
              reject(new Error('Failed to fetch data after trying multiple methods'));
            });
        };
        
        // Make the JSONP request
        script.src = jsonpUrl;
        document.body.appendChild(script);
      });
    } catch (error) {
      console.error('Fatal error in fetchData:', error);
      reject(error);
    }
  });
}

/**
 * Initialize the data fetching system
 */
function initDataFetching() {
  console.log('Initializing data fetching...');
  
  // Fetch data initially
  refreshData()
    .then(data => {
      if (data) {
        console.log('Initial data load successful');
        // Initialize the dashboard with the fetched data
        if (typeof loadConversations === 'function') {
          loadConversations();
        }
      } else {
        console.warn('Initial data load failed, using sample data');
      }
    });
  
  // Set up interval for regular data refresh
  setInterval(refreshData, CONFIG.REFRESH_INTERVAL);
}

/**
 * Refresh dashboard data
 * @param {Object} filters - Optional filters to apply
 * @returns {Promise} Promise resolving when refresh is complete
 */
function refreshData(filters = {}) {
  console.log('Refreshing data with filters:', filters);
  
  // Show refresh status
  const statusElement = document.createElement('div');
  statusElement.id = 'refresh-status';
  statusElement.style.position = 'fixed';
  statusElement.style.bottom = '20px';
  statusElement.style.right = '20px';
  statusElement.style.padding = '10px';
  statusElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
  statusElement.style.color = 'white';
  statusElement.style.borderRadius = '4px';
  statusElement.style.zIndex = '1000';
  statusElement.textContent = 'Refreshing data...';
  document.body.appendChild(statusElement);
  
  // Fetch the data
  return fetchData(filters)
    .then(data => {
      if (data) {
        // Update our dashboard data
        dashboardData = data;
        
        // Reload the current view
        if (typeof applyFilters === 'function') {
          applyFilters();
        } else if (typeof loadConversations === 'function') {
          // Fallback to loadConversations if applyFilters is not available
          loadConversations(filters);
        }
        
        // Update status
        statusElement.textContent = 'Data refreshed!';
        statusElement.style.backgroundColor = 'rgba(46,204,113,0.7)';
      } else {
        // Handle error
        statusElement.textContent = 'Failed to refresh data';
        statusElement.style.backgroundColor = 'rgba(231,76,60,0.7)';
      }
      
      // Hide status after a moment
      setTimeout(() => {
        statusElement.style.opacity = '0';
        statusElement.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          if (statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
          }
        }, 500);
      }, data ? 2000 : 3000);
      
      return data;
    })
    .catch(error => {
      console.error('Error refreshing data:', error);
      statusElement.textContent = 'Failed to refresh data: ' + error.message;
      statusElement.style.backgroundColor = 'rgba(231,76,60,0.7)';
      
      // Hide status after a moment
      setTimeout(() => {
        statusElement.style.opacity = '0';
        statusElement.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          if (statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
          }
        }, 500);
      }, 3000);
      
      return null;
    });
}

// Make dashboardData accessible outside the module
function getDashboardData() {
  return dashboardData;
}

// Function to help with debugging
function testConnection() {
  debug('Testing connection to Google Apps Script...');
  return fetchData()
    .then(data => {
      if (data) {
        debug('Connection successful! Response:');
        debug(JSON.stringify(data).substring(0, 500) + '...');
        return true;
      } else {
        debug('Connection failed - no data returned');
        return false;
      }
    })
    .catch(error => {
      debug('Connection failed with error: ' + error.message);
      return false;
    });
}

// Helper to log to debug panel if available
function debug(message) {
  console.log(message);
  
  // Also log to debug panel if it exists
  if (typeof window !== 'undefined') {
    const output = document.getElementById('debug-output');
    if (output) {
      const logEntry = document.createElement('pre');
      logEntry.textContent = new Date().toLocaleTimeString() + ': ' + message;
      output.appendChild(logEntry);
      
      // Auto-scroll to bottom
      output.scrollTop = output.scrollHeight;
    }
  }
}

// Export functions for global access
window.fetchData = fetchData;
window.refreshData = refreshData;
window.initDataFetching = initDataFetching;
window.getDashboardData = getDashboardData;
window.testConnection = testConnection;

// For testing outside of the actual implementation
if (typeof module !== 'undefined') {
  module.exports = {
    fetchData,
    refreshData,
    getDashboardData,
    testConnection
  };
}
