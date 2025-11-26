const fs = require('fs');

// Mock DOM elements
const document = {
    getElementById: () => ({
        innerHTML: '',
        appendChild: () => { },
        value: 'all'
    }),
    createElement: () => ({})
};
global.document = document;

// Mock window/global vars
let RAW_DATA = [];
let ACTIVE_FILTERS = { time: 'all', device: 'all' };

// Copy of parseCSV function from app.js (modified slightly to run in node)
function parseCSV(rows) {
    RAW_DATA = [];
    const devices = new Set();

    if (rows.length < 2) return;

    // 1. Parse Header to find indices
    const header = rows[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());

    const idx = {
        timestamp: header.indexOf('timestamp'),
        domain: header.indexOf('domain'),
        status: header.indexOf('status'),
        deviceId: header.indexOf('device_id'),
        deviceName: header.indexOf('device_name')
    };

    console.log("CSV Header:", header);
    console.log("Column Indices:", idx);

    // 2. Parse Rows
    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',');
        if (cols.length < 2) continue;

        // Helper to safely get value
        const getVal = (index) => (index !== -1 && cols[index]) ? cols[index].replace(/"/g, '').trim() : '';

        const timestampStr = getVal(idx.timestamp);
        const domain = getVal(idx.domain);
        const status = getVal(idx.status);
        const deviceId = getVal(idx.deviceId);
        const deviceName = getVal(idx.deviceName);

        // Store parsed row
        try {
            // Mock date parsing
            const date = new Date(timestampStr);
            // if (!isNaN(date)) { // Skip date check for repro
            RAW_DATA.push({
                date: date,
                domain: domain,
                status: status,
                device_id: deviceId,
                device_name: deviceName
            });

            if (deviceName) devices.add(deviceName);
            else if (deviceId) devices.add(deviceId);
            // }
        } catch (e) { }
    }

    console.log("Devices Found:", Array.from(devices));
}

// Run Test
const csvContent = `timestamp,domain,status,device_id,device_name
2023-10-27T10:00:00Z,example.com,blocked,dev1,Device A
2023-10-27T10:05:00Z,google.com,allowed,dev2,Device B`;

const rows = csvContent.split('\n');
parseCSV(rows);
