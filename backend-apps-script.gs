// Google Apps Script Backend for PO Approval Tracker
// This script handles CORS and provides API endpoints for the frontend

function doGet(e) {
  // Handle CORS preflight and actual requests
  const output = handleRequest(e);

  // Return JSON with CORS headers
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  return doGet(e);
}

function handleRequest(e) {
  try {
    const action = e.parameter.action;

    switch(action) {
      case 'getPOs':
        return getPOsData();

      case 'getApprovalHistory':
        const internalId = e.parameter.internalId;
        return getApprovalHistoryData(internalId);

      default:
        return { error: 'Invalid action' };
    }
  } catch (error) {
    Logger.log('Error in handleRequest: ' + error.toString());
    return { error: error.toString() };
  }
}

function getPOsData() {
  try {
    // TODO: Replace with your actual data source
    // Example: Fetch from Google Sheets, NetSuite API, or other source

    const spreadsheetId = 'YOUR_SPREADSHEET_ID'; // Replace with your spreadsheet ID
    const sheetName = 'PO_DATA'; // Replace with your sheet name

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const pos = data.slice(1).map(row => {
      const po = {};
      headers.forEach((header, index) => {
        po[header.toLowerCase().replace(/\s+/g, '_')] = row[index];
      });
      return po;
    });

    return { pos: pos };
  } catch (error) {
    Logger.log('Error in getPOsData: ' + error.toString());
    return { error: 'Failed to fetch PO data: ' + error.toString() };
  }
}

function getApprovalHistoryData(internalId) {
  try {
    if (!internalId) {
      return { error: 'Internal ID is required' };
    }

    // TODO: Replace with your actual data source
    const spreadsheetId = 'YOUR_SPREADSHEET_ID'; // Replace with your spreadsheet ID
    const sheetName = 'APPROVAL_HISTORY'; // Replace with your sheet name

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const history = data.slice(1)
      .filter(row => row[headers.indexOf('internal_id')] == internalId)
      .map(row => {
        const entry = {};
        headers.forEach((header, index) => {
          entry[header.toLowerCase().replace(/\s+/g, '_')] = row[index];
        });
        return entry;
      });

    return { history: history };
  } catch (error) {
    Logger.log('Error in getApprovalHistoryData: ' + error.toString());
    return { error: 'Failed to fetch approval history: ' + error.toString() };
  }
}

// Test function - you can run this from the Apps Script editor to test
function testGetPOs() {
  const result = getPOsData();
  Logger.log(JSON.stringify(result));
}

function testGetApprovalHistory() {
  const result = getApprovalHistoryData('12345');
  Logger.log(JSON.stringify(result));
}
