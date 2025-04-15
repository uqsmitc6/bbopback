/**
 * Google Apps Script Connector for BBOP Dashboard
 * 
 * This script connects to your Google Apps Script web app 
 * and fetches BBOP transcript data for the dashboard.
 */

// Configuration
const CONFIG = {
  // Your Google Apps Script Web App URL
  // You'll get this URL after deploying your Apps Script as a web app
  WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbzFlZdSUfduVujf4Qc-iN0dcwU3ifwDk5x3Q_jNw582Exrudd14HkiMrDi4b4Lbv19Q8Q/exec',
  
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
  
  // Fetch data from the web app
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok: ' + response.statusText);
      }
      return response.json();
    })
    .then(data => {
      console.log('Data fetched successfully:', data);
      return data;
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      return null;
    });
}

/**
 * Initialize the data fetching system
 */
function initDataFetching() {
  // Fetch data initially
  refreshData();
  
  // Set up interval for regular data refresh
  setInterval(refreshData, CONFIG.REFRESH_INTERVAL);
}

/**
 * Refresh dashboard data
 * @param {Object} filters - Optional filters to apply
 * @returns {Promise} Promise resolving when refresh is complete
 */
function refreshData(filters = {}) {
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
    });
}

// For testing outside of the actual implementation
if (typeof module !== 'undefined') {
  module.exports = {
    fetchData,
    refreshData
  };
}
