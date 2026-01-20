# NetSuite API Integration Guide

## Overview

This guide shows you how to add NetSuite API integration to create Purchase Orders directly from your PO Approval Tracker app.

## Architecture

```
Frontend (Vercel)
    ↓ (Creates PO request)
Google Apps Script Backend
    ↓ (Authenticates & calls NetSuite API)
NetSuite REST API
    ↓ (Creates PO)
NetSuite Database
```

**Benefits of this approach:**
- ✅ NetSuite credentials stay secure in Google Apps Script
- ✅ Frontend doesn't need NetSuite access
- ✅ Can add validation and business logic in the backend
- ✅ Audit trail of who created what POs

## Prerequisites

1. **NetSuite Account** with API access
2. **NetSuite Role** with permissions to create Purchase Orders
3. **Token-Based Authentication (TBA)** credentials from NetSuite
4. Your **NetSuite Account ID** (e.g., 4454619)

## Step 1: Set Up NetSuite Token-Based Authentication (TBA)

### 1.1 Enable Token-Based Authentication in NetSuite

1. Log in to NetSuite as an Administrator
2. Go to **Setup** > **Company** > **Enable Features**
3. Click the **SuiteCloud** subtab
4. Check **Token-Based Authentication** under "Manage Authentication"
5. Click **Save**

### 1.2 Create an Integration Record

1. Go to **Setup** > **Integration** > **Manage Integrations** > **New**
2. Fill in:
   - **Name**: "PO Approval Tracker API"
   - **Description**: "Integration for creating POs from web app"
   - **State**: **Enabled**
   - Check **Token-Based Authentication**
   - Uncheck **TBA: Authorization Flow** (we're using direct token auth)
   - Check **TBA: Issuer Token Secret**
3. Click **Save**
4. **IMPORTANT**: Copy these values (you'll need them):
   - **Consumer Key**
   - **Consumer Secret**

### 1.3 Create Access Token for Your User

1. Go to **Setup** > **Users/Roles** > **Access Tokens** > **New**
2. Fill in:
   - **Application Name**: Select "PO Approval Tracker API" (the integration you just created)
   - **User**: Select your user (must have permission to create POs)
   - **Role**: Select a role with Purchase Order creation permissions
   - **Token Name**: "PO Tracker Token"
3. Click **Save**
4. **IMPORTANT**: Copy these values immediately (shown only once):
   - **Token ID**
   - **Token Secret**

### 1.4 Note Your NetSuite Account ID

Your Account ID is in your NetSuite URL:
- URL: `https://4454619.app.netsuite.com/...`
- Account ID: `4454619`

## Step 2: Configure Google Apps Script Backend

### 2.1 Store NetSuite Credentials Securely

1. Go to your Google Apps Script: https://script.google.com/
2. Click **Project Settings** (gear icon)
3. Scroll to **Script Properties**
4. Click **Add script property** for each:

```
NETSUITE_ACCOUNT_ID = 4454619
NETSUITE_CONSUMER_KEY = [your consumer key]
NETSUITE_CONSUMER_SECRET = [your consumer secret]
NETSUITE_TOKEN_ID = [your token ID]
NETSUITE_TOKEN_SECRET = [your token secret]
```

**Why Script Properties?**
- ✅ Encrypted at rest
- ✅ Not visible in code
- ✅ Not exposed to frontend
- ✅ Easy to rotate credentials

### 2.2 Add NetSuite API Functions to Your Apps Script

Add these functions to your `backend-apps-script.gs`:

```javascript
// NetSuite Configuration
function getNetSuiteConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    accountId: props.getProperty('NETSUITE_ACCOUNT_ID'),
    consumerKey: props.getProperty('NETSUITE_CONSUMER_KEY'),
    consumerSecret: props.getProperty('NETSUITE_CONSUMER_SECRET'),
    tokenId: props.getProperty('NETSUITE_TOKEN_ID'),
    tokenSecret: props.getProperty('NETSUITE_TOKEN_SECRET')
  };
}

// Generate OAuth 1.0 signature for NetSuite
function generateNetSuiteAuthHeader(config, url, method) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Utilities.getUuid();

  const baseString = method.toUpperCase() + '&' +
    encodeURIComponent(url) + '&' +
    encodeURIComponent(
      'oauth_consumer_key=' + config.consumerKey +
      '&oauth_nonce=' + nonce +
      '&oauth_signature_method=HMAC-SHA256' +
      '&oauth_timestamp=' + timestamp +
      '&oauth_token=' + config.tokenId +
      '&oauth_version=1.0'
    );

  const signingKey = encodeURIComponent(config.consumerSecret) + '&' +
                     encodeURIComponent(config.tokenSecret);

  const signature = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(baseString, signingKey)
  );

  const authHeader = 'OAuth realm="' + config.accountId + '",' +
    'oauth_consumer_key="' + config.consumerKey + '",' +
    'oauth_token="' + config.tokenId + '",' +
    'oauth_signature_method="HMAC-SHA256",' +
    'oauth_timestamp="' + timestamp + '",' +
    'oauth_nonce="' + nonce + '",' +
    'oauth_version="1.0",' +
    'oauth_signature="' + encodeURIComponent(signature) + '"';

  return authHeader;
}

// Create Purchase Order in NetSuite
function createPurchaseOrder(poData) {
  try {
    // Validate required fields
    if (!poData.vendor || !poData.items || poData.items.length === 0) {
      return { error: 'Missing required fields: vendor and items are required' };
    }

    const config = getNetSuiteConfig();

    // Validate configuration
    if (!config.accountId || !config.consumerKey) {
      return { error: 'NetSuite API not configured. Please set up Script Properties.' };
    }

    const url = 'https://' + config.accountId + '.suitetalk.api.netsuite.com/services/rest/record/v1/purchaseOrder';
    const method = 'POST';

    // Build NetSuite PO payload
    const payload = {
      entity: { id: poData.vendor }, // Vendor ID
      tranDate: poData.tranDate || new Date().toISOString().split('T')[0],
      memo: poData.memo || '',
      department: poData.department ? { id: poData.department } : null,
      location: poData.location ? { id: poData.location } : null,
      item: {
        items: poData.items.map(item => ({
          item: { id: item.itemId },
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
          description: item.description || ''
        }))
      }
    };

    // Generate OAuth header
    const authHeader = generateNetSuiteAuthHeader(config, url, method);

    // Make API request
    const options = {
      method: method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    Logger.log('Creating PO with payload: ' + JSON.stringify(payload));

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    Logger.log('NetSuite response code: ' + responseCode);
    Logger.log('NetSuite response: ' + responseBody);

    if (responseCode === 201 || responseCode === 200) {
      const result = JSON.parse(responseBody);
      return {
        success: true,
        poId: result.id,
        poNumber: result.tranId,
        message: 'Purchase Order created successfully',
        details: result
      };
    } else {
      return {
        error: 'NetSuite API error',
        statusCode: responseCode,
        details: responseBody
      };
    }

  } catch (error) {
    Logger.log('Error creating PO: ' + error.toString());
    return {
      error: 'Failed to create Purchase Order',
      message: error.toString()
    };
  }
}

// Get vendor list from NetSuite
function getVendors() {
  try {
    const config = getNetSuiteConfig();
    const url = 'https://' + config.accountId + '.suitetalk.api.netsuite.com/services/rest/record/v1/vendor';
    const method = 'GET';

    const authHeader = generateNetSuiteAuthHeader(config, url, method);

    const options = {
      method: method,
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      const result = JSON.parse(response.getContentText());
      return {
        success: true,
        vendors: result.items || []
      };
    } else {
      return {
        error: 'Failed to fetch vendors',
        statusCode: responseCode
      };
    }
  } catch (error) {
    return {
      error: 'Failed to fetch vendors',
      message: error.toString()
    };
  }
}

// Get items from NetSuite
function getItems() {
  try {
    const config = getNetSuiteConfig();
    const url = 'https://' + config.accountId + '.suitetalk.api.netsuite.com/services/rest/record/v1/item';
    const method = 'GET';

    const authHeader = generateNetSuiteAuthHeader(config, url, method);

    const options = {
      method: method,
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      const result = JSON.parse(response.getContentText());
      return {
        success: true,
        items: result.items || []
      };
    } else {
      return {
        error: 'Failed to fetch items',
        statusCode: responseCode
      };
    }
  } catch (error) {
    return {
      error: 'Failed to fetch items',
      message: error.toString()
    };
  }
}

// Test NetSuite connection
function testNetSuiteConnection() {
  try {
    const config = getNetSuiteConfig();

    // Check if all credentials are set
    const missing = [];
    if (!config.accountId) missing.push('NETSUITE_ACCOUNT_ID');
    if (!config.consumerKey) missing.push('NETSUITE_CONSUMER_KEY');
    if (!config.consumerSecret) missing.push('NETSUITE_CONSUMER_SECRET');
    if (!config.tokenId) missing.push('NETSUITE_TOKEN_ID');
    if (!config.tokenSecret) missing.push('NETSUITE_TOKEN_SECRET');

    if (missing.length > 0) {
      return {
        success: false,
        error: 'Missing script properties: ' + missing.join(', ')
      };
    }

    // Try a simple API call to verify credentials
    const url = 'https://' + config.accountId + '.suitetalk.api.netsuite.com/services/rest/record/v1/metadata-catalog';
    const method = 'GET';

    const authHeader = generateNetSuiteAuthHeader(config, url, method);

    const options = {
      method: method,
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      return {
        success: true,
        message: 'NetSuite API connection successful!',
        accountId: config.accountId
      };
    } else {
      return {
        success: false,
        error: 'Authentication failed',
        statusCode: responseCode,
        response: response.getContentText()
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}
```

### 2.3 Update the doGet Handler

Add new cases to your `doGet` function:

```javascript
function doGet(e) {
  Logger.log('Incoming request - action: ' + (e.parameter.action || 'none'));

  const params = e.parameter;
  const action = params.action;

  let result;

  try {
    switch(action) {
      case 'getPOs':
        result = getPOsList();
        break;
      case 'getApprovalHistory':
        result = getApprovalHistory(params.internalId);
        break;
      case 'getApprovedPOs':
        result = getApprovedPOs();
        break;
      case 'createPO':
        // Parse JSON body for POST requests
        const poData = JSON.parse(e.postData.contents);
        result = createPurchaseOrder(poData);
        break;
      case 'getVendors':
        result = getVendors();
        break;
      case 'getItems':
        result = getItems();
        break;
      case 'testNetSuite':
        result = testNetSuiteConnection();
        break;
      case 'test':
        result = {
          success: true,
          message: 'Backend is working!',
          timestamp: new Date().toISOString(),
          spreadsheetId: SPREADSHEET_ID
        };
        break;
      default:
        result = {
          error: 'Invalid action',
          validActions: ['getPOs', 'getApprovalHistory', 'getApprovedPOs', 'createPO', 'getVendors', 'getItems', 'testNetSuite', 'test']
        };
    }

    return createResponse(result);
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    return createResponse({
      error: error.toString(),
      stack: error.stack
    });
  }
}
```

### 2.4 Deploy the Updated Script

1. Click **Deploy** > **Manage deployments**
2. Click the **edit icon** (pencil) on your active deployment
3. Change **Version** to "New version"
4. Add description: "Added NetSuite API integration"
5. Click **Deploy**

## Step 3: Test NetSuite Connection

### 3.1 Test in Apps Script Editor

1. In the function dropdown, select **`testNetSuiteConnection`**
2. Click **Run**
3. Click **View** > **Logs**
4. You should see: `"success": true, "message": "NetSuite API connection successful!"`

### 3.2 Test via URL

Visit this URL in your browser:

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=testNetSuite
```

**Expected response:**
```json
{
  "success": true,
  "message": "NetSuite API connection successful!",
  "accountId": "4454619"
}
```

## Step 4: Frontend UI for Creating POs

I can create a React component for the PO creation form that includes:
- Vendor selection dropdown
- Line items with item/quantity/rate
- Department/location selection
- Memo field
- Validation
- Submit button

Would you like me to create the frontend component next?

## Security Considerations

### Access Control

You should add role-based permissions:

```javascript
// Add to backend
const AUTHORIZED_PO_CREATORS = [
  'admin@yourcompany.com',
  'purchasing@yourcompany.com'
];

function canCreatePO(userEmail) {
  return AUTHORIZED_PO_CREATORS.includes(userEmail);
}

function createPurchaseOrder(poData) {
  // Get user email from session (you'll need to pass this)
  const userEmail = poData.createdBy;

  if (!canCreatePO(userEmail)) {
    return {
      error: 'Unauthorized',
      message: 'You do not have permission to create Purchase Orders'
    };
  }

  // Rest of the function...
}
```

### Audit Trail

Log all PO creations:

```javascript
function logPOCreation(poData, result, userEmail) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = ss.getSheetByName('PO_Creation_Log') || ss.insertSheet('PO_Creation_Log');

  logSheet.appendRow([
    new Date(),
    userEmail,
    result.poNumber || 'Failed',
    result.poId || 'N/A',
    JSON.stringify(poData),
    result.success ? 'Success' : 'Failed',
    result.error || ''
  ]);
}
```

## Next Steps

1. ✅ Set up NetSuite TBA credentials
2. ✅ Add credentials to Google Apps Script Properties
3. ✅ Add NetSuite functions to backend
4. ✅ Test NetSuite connection
5. ⏳ Create frontend UI for PO creation
6. ⏳ Add access controls
7. ⏳ Test end-to-end PO creation

Would you like me to create the frontend component for the PO creation form?
