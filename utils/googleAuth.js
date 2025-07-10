const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

let authClient = null;
let isInitializing = false;

// Load credentials and authenticate
async function initializeGoogleAuth() {
  if (authClient) return authClient; // Return if already initialized
  if (isInitializing) {
    // Wait if initialization is already in progress
    return new Promise(resolve => {
      const checkAuth = setInterval(() => {
        if (authClient) {
          clearInterval(checkAuth);
          resolve(authClient);
        }
      }, 100);
    });
  }

  isInitializing = true;
  
  try {
    console.log('Initializing Google Auth...');
    
    // Verify credentials file exists
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error(`Credentials file not found at: ${CREDENTIALS_PATH}`);
    }

    // Load service account credentials
    // const serviceAccount = require(CREDENTIALS_PATH);
    
    // Create JWT client directly
    authClient = new google.auth.JWT({
      email: config.client_email,
      key: config.private_key,
      scopes: SCOPES
    });

    // Force authentication immediately
    await authClient.authorize();
    console.log('Google Sheets authentication successful');
    return authClient;
  } catch (error) {
    console.error('Google authentication failed:', error);
    authClient = null; // Reset on failure
    throw error;
  } finally {
    isInitializing = false;
  }
}

module.exports = {
  authClient,
  initializeGoogleAuth
}