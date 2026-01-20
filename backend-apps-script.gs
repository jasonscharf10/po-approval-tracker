// PO Tracker Backend - Google Apps Script
// Deploy this as a Web App with "Anyone" access

// Your spreadsheet ID (get from the URL)
const SPREADSHEET_ID = '1P5HhtUKhfEdHxEr2QyshVEXKYzWrbedkeFKkiY-xVS4';

// Main handler for GET requests
function doGet(e) {
  // Log incoming request for debugging
  Logger.log('Incoming request - action: ' + (e.parameter.action || 'none'));
  Logger.log('Request parameters: ' + JSON.stringify(e.parameter));

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
      case 'test':
        // Simple test endpoint to verify backend is accessible
        result = {
          success: true,
          message: 'Backend is working!',
          timestamp: new Date().toISOString(),
          spreadsheetId: SPREADSHEET_ID
        };
        break;
      default:
        result = {
          error: 'Invalid action. Valid actions: getPOs, getApprovalHistory, getApprovedPOs, test',
          action: action
        };
    }

    Logger.log('Response: ' + JSON.stringify(result).substring(0, 200) + '...');
    return createResponse(result);
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return createResponse({
      error: error.toString(),
      stack: error.stack,
      action: action
    });
  }
}

// Handle POST requests the same way as GET
function doPost(e) {
  return doGet(e);
}

// Create CORS-enabled response
// This is critical for fixing the "Failed to fetch" error
function createResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);

  // Note: Google Apps Script automatically handles CORS when deployed as Web App with "Anyone" access
  // No need to manually set Access-Control-Allow-Origin headers

  return output;
}

// Get all POs from "POs List" sheet
function getPOsList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('POs List');

    if (!sheet) {
      return { error: 'POs List sheet not found' };
    }

    const data = sheet.getDataRange().getValues();

    // Assuming first row is headers
    const headers = data[0];
    const pos = [];

    // Process each row (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const po = {};

      // Map each column to the header name
      headers.forEach((header, index) => {
        let value = row[index];

        // Format dates if needed
        if (value instanceof Date) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }

        // Clean up the header name (lowercase, remove spaces)
        const key = header.toString().toLowerCase().replace(/\s+/g, '_');
        po[key] = value;
      });

      // Only add if the row has data (check if PO number exists)
      if (po.po_number || po.document_number || po.id) {
        pos.push(po);
      }
    }

    Logger.log('Successfully fetched ' + pos.length + ' POs');
    return { pos: pos, count: pos.length };
  } catch (error) {
    Logger.log('Error in getPOsList: ' + error.toString());
    return { error: 'Failed to fetch PO data: ' + error.toString() };
  }
}

// Get approval history for a specific PO by internal_id
function getApprovalHistory(internalId) {
  try {
    if (!internalId) {
      return { error: 'Internal ID is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('ApprovalHistoryList');

    if (!sheet) {
      return { error: 'ApprovalHistoryList sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const history = [];

    // Find the column index for Record ID (column A, index 0)
    const recordIdColumnIndex = headers.findIndex(h =>
      h.toString().toLowerCase().includes('record') && h.toString().toLowerCase().includes('id')
    );

    // If not found, assume it's the first column
    const columnToCheck = recordIdColumnIndex >= 0 ? recordIdColumnIndex : 0;

    // Process each row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Check if this row matches the internal_id
      const rowRecordId = row[columnToCheck];
      if (rowRecordId && rowRecordId.toString() === internalId.toString()) {
        const record = {};

        headers.forEach((header, index) => {
          let value = row[index];

          // Format dates and datetimes
          if (value instanceof Date) {
            // Check if it has time component
            if (value.getHours() !== 0 || value.getMinutes() !== 0) {
              value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
            } else {
              value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
            }
          }

          const key = header.toString().toLowerCase().replace(/\s+/g, '_');
          record[key] = value;
        });

        history.push(record);
      }
    }

    // Sort by date (most recent first)
    history.sort((a, b) => {
      const dateA = a.date || a.timestamp || a.created_date || '';
      const dateB = b.date || b.timestamp || b.created_date || '';
      return dateB.toString().localeCompare(dateA.toString());
    });

    Logger.log('Successfully fetched ' + history.length + ' approval records for internal ID: ' + internalId);
    return { history: history, internalId: internalId, count: history.length };
  } catch (error) {
    Logger.log('Error in getApprovalHistory: ' + error.toString());
    return { error: 'Failed to fetch approval history: ' + error.toString() };
  }
}

// Get fully approved POs from ApprovalHistoryList only
function getApprovedPOs() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Get approval history sheet
    const approvalSheet = ss.getSheetByName('ApprovalHistoryList');
    if (!approvalSheet) {
      return { error: 'ApprovalHistoryList sheet not found' };
    }

    // Get approval history data
    const approvalData = approvalSheet.getDataRange().getValues();
    const approvalHeaders = approvalData[0];

    // Find column indices
    const internalIdIndex = approvalHeaders.findIndex(h =>
      h.toString().toLowerCase().includes('internal') && h.toString().toLowerCase().includes('id')
    );
    const statusIndex = approvalHeaders.findIndex(h =>
      h.toString().toLowerCase().includes('approval') && h.toString().toLowerCase().includes('status')
    );
    const departmentIndex = approvalHeaders.findIndex(h =>
      h.toString().toLowerCase().includes('department')
    );
    const actionDateIndex = approvalHeaders.findIndex(h =>
      h.toString().toLowerCase().includes('action') && h.toString().toLowerCase().includes('date')
    );

    // Build map of approved POs (using most recent approval date)
    const approvedPOsMap = {};

    for (let i = 1; i < approvalData.length; i++) {
      const row = approvalData[i];
      const status = row[statusIndex];
      const internalId = row[internalIdIndex];

      if (status && status.toString() === 'Approved' && internalId) {
        const internalIdStr = internalId.toString();

        // If we haven't seen this internal_id yet, or this is a more recent date, use this record
        if (!approvedPOsMap[internalIdStr]) {
          const po = {};

          approvalHeaders.forEach((header, index) => {
            let value = row[index];

            // Format dates if needed
            if (value instanceof Date) {
              value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
            }

            const key = header.toString().toLowerCase().replace(/\s+/g, '_');
            po[key] = value;
          });

          // Add fields that match POs List structure
          po.document_number = 'Approved-' + internalIdStr;
          po.name = 'Fully Approved PO';
          po.status = 'Fully Approved';
          po.date = po.action_date || '';
          po['department_(no_hierarchy)'] = po.department || '';

          approvedPOsMap[internalIdStr] = po;
        }
      }
    }

    // Convert map to array
    const approvedPOs = Object.values(approvedPOsMap);

    Logger.log('Successfully fetched ' + approvedPOs.length + ' approved POs');
    return { pos: approvedPOs, count: approvedPOs.length };
  } catch (error) {
    Logger.log('Error in getApprovedPOs: ' + error.toString());
    return { error: 'Failed to fetch approved POs: ' + error.toString() };
  }
}

// Test functions - run these to verify your setup
function testGetPOs() {
  const result = getPOsList();
  Logger.log(JSON.stringify(result, null, 2));
}

function testGetApprovalHistory() {
  // Replace with an actual internal_id from your sheet (e.g., 16947179)
  const result = getApprovalHistory('16947179');
  Logger.log(JSON.stringify(result, null, 2));
}

function testGetApprovedPOs() {
  const result = getApprovedPOs();
  Logger.log(JSON.stringify(result, null, 2));
}

function testBackend() {
  // Comprehensive test
  Logger.log('=== Testing Backend ===');

  Logger.log('\n1. Testing getPOsList:');
  const posResult = getPOsList();
  Logger.log('POs count: ' + (posResult.count || 0));
  if (posResult.error) Logger.log('Error: ' + posResult.error);

  Logger.log('\n2. Testing getApprovalHistory:');
  const historyResult = getApprovalHistory('16947179');
  Logger.log('History count: ' + (historyResult.count || 0));
  if (historyResult.error) Logger.log('Error: ' + historyResult.error);

  Logger.log('\n3. Testing getApprovedPOs:');
  const approvedResult = getApprovedPOs();
  Logger.log('Approved POs count: ' + (approvedResult.count || 0));
  if (approvedResult.error) Logger.log('Error: ' + approvedResult.error);

  Logger.log('\n=== Test Complete ===');
}

// Helper function to get all sheet names (for debugging)
function listSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  const names = sheets.map(s => s.getName());
  Logger.log('Available sheets: ' + names.join(', '));
  return names;
}
