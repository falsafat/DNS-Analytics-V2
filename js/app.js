// --- CONFIG & STATE ---
let RAW_DATA = []; // Store all parsed rows
let ACTIVE_FILTERS = {
    time: 'all', // 'all', 'custom', or hours (e.g. 12, 24)
    dateRange: [], // [start, end] for custom range
    device: 'all',
    risk: 'all'
};

let CURRENT_DATA = {
    total: 0,
    blocked: 0,
    hourly: new Array(24).fill(0),
    topDomains: [],
    riskyDomains: [],
    maxRiskLevel: 1,
    riskDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
};

// 5-Level Risk Mapping
const RISK_MAPPING = {
    5: [ // Explicit Adult (Block)
        "pornhub", "xvideos", "xnxx", "chaturbate", "livejasmin", "brazzers", "redtube", "youporn",
        "onlyfans", "nhentai", "sharmuta", "kantot", "iyot", "rape", "incest", "pedophile",
        "eporner", "hqporner", "spankbang", "xhamster", "beeg", "youjizz", "motherless", "tube8",
        "keezmovies", "sunporno", "madthumbs", "extremetube", "slutload", "xxxymovies", "vlxx", "xvideos2",
        "beastiality", "bestiality", "zoophilia", "childporn", "lolita",
        // Filipino Specific
        "pinayflix", "pinaysex", "pinaywalker", "kantutan", "iyutan", "boso", "scandalpinay", "bold-pinay",
        // Arabic Specific
        "arabs-sex", "six-arabe", "jins-araby", "aflam-jins", "nik-araby", "kuss-araby", "sharmuta-araby",
        // More English/Global
        "adultwork", "cam4", "camsoda", "faphouse", "bangbros", "naughtyamerica", "realitykings", "teamskeet"
    ],
    4: [ // Mature & Gambling (Restrict)
        "porn", "sex", "xxx", "fuck", "gangbang", "creampie", "blowjob", "cum", "orgasm",
        "bdsm", "fetish", "bondage", "bomba", "torjak", "jakol", "nik", "nekh", "jins", "ibahi",
        "casino", "bet", "poker", "gambling", "slots", "roulette", "vape", "weed", "drug", "cannabis",
        "bet365", "1xbet", "888casino", "pokerstars", "draftkings", "fanduel", "jackpot", "lottery", "lotto", "bookie", "parlay", "wagering",
        "marijuana", "thc", "cbd", "kush", "sativa", "indica", "bong", "shrooms", "psilocybin", "lsd", "acid", "cocaine", "heroin", "meth", "mdma", "ecstasy", "pill", "opioid",
        "gore", "death", "suicide", "kill", "murder", "terror", "bomb", "weapon", "gun", "ammo", "execution", "beheading",
        "tinder", "bumble", "grindr", "hinge", "okcupid", "match.com", "ashleymadison", "adultfriendfinder"
    ],
    3: [ // Slang & Suggestive (Monitor)
        "nude", "adult", "milf", "anal", "pussy", "dick", "cock", "boobs", "tits", "booty", "ass",
        "escort", "strip", "erotic", "kink", "hentai", "titi", "etits", "pekpek", "jabol",
        "boldstar", "pokpok", "fubu", "kuss", "zebb", "siks", "tiz",
        "thot", "simp", "lewd", "nsfw", "ahegao", "ecchi", "yuri", "yaoi", "futanari", "upskirt", "downblouse",
        "lason", "sabog", "bato", "chongke", "luti", "manyak", "quwad"
    ],
    2: [ // Suspicious (Verify)
        "tube", "cam", "uncensored", "leaked", "amateur", "bold", "scandal", "pinay", "libog", "kayat", "viral", "dating",
        "proxy", "vpn", "bypass", "unblock", "hide", "anonymizer",
        "torrent", "magnet", "warez", "crack", "hack", "cheat"
    ]
    // Level 1 is Safe (default)
};

const RISK_CONFIG = {
    1: { label: "Safe / Clean", color: "#51cf66", class: "risk-safe" },
    2: { label: "Suspicious", color: "#4dabf7", class: "risk-low" },
    3: { label: "Slang & Suggestive", color: "#fcc419", class: "risk-medium" },
    4: { label: "Mature & Gambling", color: "#ff922b", class: "risk-high" },
    5: { label: "Explicit Adult", color: "#ff6b6b", class: "risk-critical" }
};

let hourlyChart = null;
let riskChart = null;
let datePicker = null; // Flatpickr instance

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing...");
    loadApiKey();
    loadTheme();
    setupFileUpload();
    setupDatePicker();

    // Initialize charts
    initChart();
    initRiskChart();
});

function setupDatePicker() {
    datePicker = flatpickr("#dateRangePicker", {
        mode: "range",
        dateFormat: "Y-m-d H:i",
        enableTime: true,
        time_24hr: true,
        onChange: function (selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                ACTIVE_FILTERS.time = 'custom';
                ACTIVE_FILTERS.dateRange = selectedDates;
                updateTimeButtons('custom');
                processFilteredData();
            }
        }
    });
}

function setTimePreset(hours) {
    ACTIVE_FILTERS.time = hours;
    ACTIVE_FILTERS.dateRange = []; // Clear custom range
    datePicker.clear(); // Clear picker visual
    updateTimeButtons(hours);
    processFilteredData();
}

function updateTimeButtons(activeId) {
    document.querySelectorAll('.time-controls .filter-btn').forEach(btn => btn.classList.remove('active'));
    if (activeId === 'all') document.getElementById('btnAll').classList.add('active');
    else if (activeId === 12) document.getElementById('btn12h').classList.add('active');
    else if (activeId === 24) document.getElementById('btn24h').classList.add('active');
    else if (activeId === 168) document.getElementById('btn7d').classList.add('active');
}

// --- THEME HANDLING ---
function applyFilters() {
    // Device filter change triggers this
    ACTIVE_FILTERS.device = document.getElementById('deviceFilter').value;
    processFilteredData();
}

function processFilteredData() {
    if (RAW_DATA.length === 0) return;

    const now = new Date();
    let filtered = RAW_DATA;

    // 1. Time Filter
    if (ACTIVE_FILTERS.time === 'custom' && ACTIVE_FILTERS.dateRange.length === 2) {
        const [start, end] = ACTIVE_FILTERS.dateRange;
        filtered = filtered.filter(row => row.date >= start && row.date <= end);
    } else if (ACTIVE_FILTERS.time !== 'all') {
        const hours = parseInt(ACTIVE_FILTERS.time);
        if (!isNaN(hours)) {
            const cutoff = new Date(now.getTime() - (hours * 60 * 60 * 1000));
            filtered = filtered.filter(row => row.date >= cutoff);
        }
    }

    // 2. Device Filter
    if (ACTIVE_FILTERS.device !== 'all') {
        filtered = filtered.filter(row => row.device_name === ACTIVE_FILTERS.device || row.device_id === ACTIVE_FILTERS.device);
    }

    // 3. Aggregate Data
    analyzeData(filtered);
}

// --- FILE PROCESSING ---
// ... (setupFileUpload and processFile remain mostly same, calling parseCSV instead of analyzeCSV) ...

function processFile(file) {
    if (!file) return;
    const subtitle = document.getElementById('fileSubtitle');
    subtitle.innerText = "📂 Reading file...";

    const reader = new FileReader();
    reader.onload = function (e) {
        subtitle.innerText = "⚙️ Parsing CSV...";
        // Use setTimeout to allow UI to update before blocking operation
        setTimeout(() => {
            const text = e.target.result;
            const rows = text.split('\n');
            parseCSV(rows, file.name);
        }, 50);
    };
    reader.readAsText(file);
}

function parseCSV(rows, fileName) {
    document.getElementById('fileSubtitle').innerText = "📊 Analyzing data...";
    RAW_DATA = [];
    const devices = new Set();

    if (rows.length < 2) return;

    // Helper: Robust CSV Line Parser (handles quotes)
    const parseLine = (text) => {
        const result = [];
        let cell = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(cell.trim());
                cell = '';
            } else {
                cell += char;
            }
        }
        result.push(cell.trim());
        return result;
    };

    // 1. Parse Header
    const headerLine = rows[0];
    const header = parseLine(headerLine).map(h => h.replace(/"/g, '').toLowerCase());

    const idx = {
        timestamp: header.findIndex(h => h.includes('timestamp') || h.includes('date')),
        domain: header.findIndex(h => h === 'domain' || h === 'query'),
        status: header.findIndex(h => h === 'status'),
        deviceId: header.findIndex(h => h === 'device_id' || h === 'device id'),
        deviceName: header.findIndex(h => h === 'device_name' || h === 'device name' || h === 'device')
    };

    console.log("CSV Header:", header);
    console.log("Column Indices:", idx);

    if (idx.timestamp === -1 || idx.domain === -1) {
        alert("Error: CSV missing 'timestamp' or 'domain' columns.");
        return;
    }

    // 2. Parse Rows
    for (let i = 1; i < rows.length; i++) {
        const line = rows[i].trim();
        if (!line) continue;

        const cols = parseLine(line);

        // Helper to safely get value
        const getVal = (index) => (index !== -1 && cols[index]) ? cols[index].replace(/"/g, '').trim() : '';

        const timestampStr = getVal(idx.timestamp);
        const domain = getVal(idx.domain);
        const status = getVal(idx.status);
        const deviceId = getVal(idx.deviceId);
        const deviceName = getVal(idx.deviceName);

        // Store parsed row
        try {
            const date = new Date(timestampStr);
            if (!isNaN(date)) {
                RAW_DATA.push({
                    date: date,
                    domain: domain,
                    status: status,
                    device_id: deviceId,
                    device_name: deviceName
                });

                // Heuristic: If deviceName looks like a domain (has dot, no spaces) and matches the domain column, ignore it
                // Also ignore if it's exactly the same as the domain
                let validDevice = deviceName;
                if (!validDevice && deviceId) validDevice = deviceId;

                if (validDevice) {
                    // Check if it looks like a domain (simple check)
                    // Most devices don't have TLDs like .com, .net, .org
                    // But some might be "host.local".
                    // If it equals the domain field, it's definitely wrong (unless the device IS the domain, which is weird)
                    if (validDevice !== domain) {
                        devices.add(validDevice);
                    }
                }
            }
        } catch (e) { }
    }

    // Update Device Dropdown
    const deviceSelect = document.getElementById('deviceFilter');
    deviceSelect.innerHTML = '<option value="all">All Devices</option>';

    // Sort devices alphabetically
    const sortedDevices = Array.from(devices).sort();

    sortedDevices.forEach(d => {
        const option = document.createElement('option');
        option.value = d;
        option.innerText = d;
        deviceSelect.appendChild(option);
    });

    console.log(`Parsed ${RAW_DATA.length} rows. Found ${devices.size} devices.`);

    if (fileName) {
        document.getElementById('fileSubtitle').innerText = `✅ Analysis for Log File: ${fileName}`;
    }

    // Initial Processing
    processFilteredData();
}

function analyzeData(rows) {
    let total = 0;
    let blocked = 0;
    let domainCounts = {};
    let hourly = new Array(24).fill(0);
    let risky = [];
    let maxRisk = 1;
    let riskDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    rows.forEach(row => {
        total++;
        if (row.status.includes('blocked')) blocked++;

        const rootDomain = row.domain.split('.').slice(-2).join('.');
        domainCounts[rootDomain] = (domainCounts[rootDomain] || 0) + 1;

        let hour = row.date.getHours() + 3; // +3 Timezone offset (Keep consistent with previous logic)
        if (hour >= 24) hour -= 24;
        hourly[hour]++;

        // Risk Analysis (Same logic as before)
        let domainRiskLevel = 1;
        const domain = row.domain;

        // ... (Risk checking logic - copy from previous analyzeCSV) ...
        // Check Critical (5)
        for (let kw of RISK_MAPPING[5]) { if (domain.includes(kw)) { domainRiskLevel = 5; break; } }
        // Check High (4)
        if (domainRiskLevel === 1) { for (let kw of RISK_MAPPING[4]) { if (domain.includes(kw)) { domainRiskLevel = 4; break; } } }
        // Check Medium (3)
        if (domainRiskLevel === 1) { for (let kw of RISK_MAPPING[3]) { if (domain.includes(kw)) { domainRiskLevel = 3; break; } } }
        // Check Low (2)
        if (domainRiskLevel === 1) { for (let kw of RISK_MAPPING[2]) { if (domain.includes(kw) && !domain.includes('youtube')) { domainRiskLevel = 2; break; } } }

        riskDist[domainRiskLevel]++;

        if (domainRiskLevel > 1) {
            risky.push({ name: domain, count: 1, level: domainRiskLevel });
            if (domainRiskLevel > maxRisk) maxRisk = domainRiskLevel;
        }
    });

    // ... (Aggregation of risky domains and top domains - copy from previous analyzeCSV) ...
    const riskyCounts = {};
    risky.forEach(r => {
        if (!riskyCounts[r.name]) {
            riskyCounts[r.name] = { count: 0, level: r.level };
        }
        riskyCounts[r.name].count++;
    });

    const riskyFinal = Object.keys(riskyCounts).map(k => ({
        name: k,
        count: riskyCounts[k].count,
        level: riskyCounts[k].level
    }));

    const sortedDomains = Object.keys(domainCounts)
        .map(key => ({ name: key, count: domainCounts[key] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

    CURRENT_DATA = {
        total: total,
        blocked: blocked,
        hourly: hourly,
        topDomains: sortedDomains,
        riskyDomains: riskyFinal,
        maxRiskLevel: maxRisk,
        riskDistribution: riskDist,
        filter: CURRENT_DATA.filter // Keep existing risk filter
    };

    renderDashboard(CURRENT_DATA);
}

// --- DASHBOARD RENDERING ---
function renderDashboard(data) {
    document.getElementById('totalQueries').innerText = data.total.toLocaleString();
    document.getElementById('blockedQueries').innerText = data.blocked.toLocaleString();

    // Hide No Data Overlays
    if (data.total > 0) {
        document.getElementById('hourlyNoData').style.display = 'none';
        document.getElementById('riskNoData').style.display = 'none';
    }

    updateChartData(data.hourly);
    updateRiskChartData(data.riskDistribution);

    const list = document.getElementById('topDomainsList');
    list.innerHTML = '';
    data.topDomains.forEach(d => {
        const li = document.createElement('li');
        li.className = 'domain-item';
        const searchUrl = `https://www.google.com/search?q=what+is+${encodeURIComponent(d.name)}`;

        li.innerHTML = `
            <div class="domain-left">
                <button class="ai-btn" onclick="analyzeDomain('${d.name}')" title="Ask AI about this domain">
                    ✨ Explain
                </button>
                <a href="${searchUrl}" target="_blank" class="domain-name">${d.name}</a>
            </div>
            <span class="domain-count">${d.count.toLocaleString()}</span>
        `;
        list.appendChild(li);
    });

    // Render Risk Results
    const riskContainer = document.getElementById('riskResults');
    const globalBadge = document.getElementById('globalRiskBadge');

    const riskInfo = RISK_CONFIG[data.maxRiskLevel];
    globalBadge.className = `risk-badge ${riskInfo.class}`;
    globalBadge.style.backgroundColor = riskInfo.color;
    globalBadge.style.color = data.maxRiskLevel >= 3 ? '#000' : '#fff';
    if (data.maxRiskLevel === 1) globalBadge.style.color = '#fff';

    globalBadge.innerText = riskInfo.label;

    // Filter Logic
    let filteredRisks = data.riskyDomains;
    if (data.filter !== 'all') {
        filteredRisks = filteredRisks.filter(d => d.level === parseInt(data.filter));
    }

    // Update Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText === 'All' && data.filter === 'all') btn.classList.add('active');
        if (btn.innerText === 'Explicit' && data.filter == 5) btn.classList.add('active');
        if (btn.innerText === 'Mature' && data.filter == 4) btn.classList.add('active');
        if (btn.innerText === 'Suggestive' && data.filter == 3) btn.classList.add('active');
        if (btn.innerText === 'Suspicious' && data.filter == 2) btn.classList.add('active');
    });

    const riskCount = filteredRisks.length;
    document.getElementById('riskQueries').innerText = data.riskyDomains.length;
    document.getElementById('riskQueries').style.color = data.riskyDomains.length > 0 ? RISK_CONFIG[data.maxRiskLevel].color : 'var(--success)';

    // Show/Hide Verify Button
    const verifyBtn = document.getElementById('verifyBtn');
    if (data.riskyDomains.length > 0) {
        verifyBtn.style.display = 'block';
    } else {
        verifyBtn.style.display = 'none';
    }

    if (riskCount > 0) {
        riskContainer.innerHTML = '';
        // Sort by risk level descending
        filteredRisks.sort((a, b) => b.level - a.level);

        filteredRisks.forEach(d => {
            const div = document.createElement('div');
            div.className = 'domain-item';
            const levelInfo = RISK_CONFIG[d.level];

            div.innerHTML = `
                <div class="domain-left">
                    <button class="ai-btn" onclick="analyzeDomain('${d.name}')">✨ Explain</button>
                    <div style="display:flex; flex-direction:column;">
                        <div>
                            <span style="color:${levelInfo.color}; font-weight:bold;">[L${d.level}] ${d.name}</span>
                            ${d.verified ? '<span title="Verified by AI" style="cursor:help">✅</span>' : ''}
                        </div>
                        ${d.reason ? `<small style="color:var(--text-muted); font-size:0.8em;">${d.reason}</small>` : ''}
                    </div>
                </div>
                <span class="domain-count">${d.count}</span>
            `;
            riskContainer.appendChild(div);
        });
    } else {
        if (data.riskyDomains.length > 0 && riskCount === 0) {
            riskContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">No domains found for this filter.</div>`;
        } else {
            riskContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">✅ No explicit adult domains found.<br><small>System Clean (Level 1)</small></div>`;
        }
    }
}

function filterRisk(level) {
    CURRENT_DATA.filter = level;
    renderDashboard(CURRENT_DATA);
}

function exportReport() {
    if (CURRENT_DATA.riskyDomains.length === 0) {
        alert("No risky domains to export!");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Domain,Risk Level,Count,Verified,Reason\n";
    CURRENT_DATA.riskyDomains.forEach(row => {
        const levelName = RISK_CONFIG[row.level].label;
        const reason = row.reason ? `"${row.reason}"` : "";
        csvContent += `${row.name},${levelName} (L${row.level}),${row.count},${row.verified ? 'Yes' : 'No'},${reason}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dns_risk_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function verifyRisksWithAI() {
    const btn = document.getElementById('verifyBtn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "✨ Verifying...";

    const domainsToVerify = CURRENT_DATA.riskyDomains.filter(d => !d.verified);
    const BATCH_SIZE = 15;
    let processedCount = 0;

    for (let i = 0; i < domainsToVerify.length; i += BATCH_SIZE) {
        const batch = domainsToVerify.slice(i, i + BATCH_SIZE);
        btn.innerText = `✨ Verifying batch ${Math.ceil((i + 1) / BATCH_SIZE)}/${Math.ceil(domainsToVerify.length / BATCH_SIZE)}...`;

        const domainList = batch.map(d => d.name).join(", ");

        const prompt = `Analyze the following domains for child safety risks.
        Domains: ${domainList}

        For EACH domain, rate the risk (1-5) and provide a very brief reason (max 10 words).
        Criteria:
        1: Safe/Clean
        2: Suspicious (Ambiguous terms, verify required)
        3: Slang & Suggestive (Hidden meanings, anatomy)
        4: Mature & Gambling (Dating, drugs, gambling, explicit acts)
        5: Explicit Adult (Known porn, severe content)

        Return a JSON ARRAY only. No markdown.
        Format: [{"domain": "example.com", "level": 1, "reason": "Safe tech site"}, ...]`;

        try {
            let result = await callGemini(prompt);
            // Clean up potential markdown code blocks
            result = result.replace(/```json/g, '').replace(/```/g, '').trim();

            const analyzedBatch = JSON.parse(result);

            analyzedBatch.forEach(item => {
                const domainObj = batch.find(d => d.name === item.domain);
                if (domainObj) {
                    domainObj.level = item.level;
                    domainObj.reason = item.reason;
                    domainObj.verified = true;
                }
            });

        } catch (e) {
            console.error("Batch verification failed", e);
        }

        processedCount += batch.length;
        await new Promise(r => setTimeout(r, 4000));
    }

    // Re-evaluate max risk and distribution
    let maxRisk = 1;
    let riskDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    CURRENT_DATA.riskyDomains = CURRENT_DATA.riskyDomains.filter(d => {
        if (d.level === 1) return false; // Remove safe domains
        return true;
    });

    CURRENT_DATA.riskyDomains.forEach(d => {
        if (d.level > maxRisk) maxRisk = d.level;
        riskDist[d.level] = (riskDist[d.level] || 0) + 1;
    });

    CURRENT_DATA.maxRiskLevel = maxRisk > 1 ? maxRisk : 1;

    CURRENT_DATA.riskDistribution[2] = 0;
    CURRENT_DATA.riskDistribution[3] = 0;
    CURRENT_DATA.riskDistribution[4] = 0;
    CURRENT_DATA.riskDistribution[5] = 0;

    CURRENT_DATA.riskyDomains.forEach(d => {
        CURRENT_DATA.riskDistribution[d.level] += d.count;
    });

    btn.innerText = originalText;
    btn.disabled = false;

    renderDashboard(CURRENT_DATA);
    alert("Verification Complete! Risk levels updated.");
}

function closeModal(e) {
    if (e.target.id === 'aiModal') document.getElementById('aiModal').style.display = 'none';
}

// --- RECONSTRUCTED FUNCTIONS ---

function loadApiKey() {
    const key = localStorage.getItem('gemini_api_key');
    if (key) {
        document.getElementById('apiKey').value = key;
    }
}

function saveApiKey() {
    const key = document.getElementById('apiKey').value;
    localStorage.setItem('gemini_api_key', key);
    alert("API Key Saved!");
}

function loadTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggle');
    btn.innerText = theme === 'light' ? '🌙' : '☀️';
}

function setupFileUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.background = 'rgba(51, 154, 240, 0.05)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        dropZone.style.background = 'transparent';
        const files = e.dataTransfer.files;
        if (files.length) processFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) processFile(e.target.files[0]);
    });
}

function initChart() {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Queries',
                data: new Array(24).fill(0),
                backgroundColor: '#339af0',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function initRiskChart() {
    const ctx = document.getElementById('riskChart').getContext('2d');
    riskChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Safe', 'Suspicious', 'Suggestive', 'Mature', 'Explicit'],
            datasets: [{
                data: [100, 0, 0, 0, 0],
                backgroundColor: [
                    RISK_CONFIG[1].color,
                    RISK_CONFIG[2].color,
                    RISK_CONFIG[3].color,
                    RISK_CONFIG[4].color,
                    RISK_CONFIG[5].color
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true } }
            }
        }
    });
}

function updateChartData(hourlyData) {
    if (hourlyChart) {
        hourlyChart.data.datasets[0].data = hourlyData;
        hourlyChart.update();
    }
}

function updateRiskChartData(distribution) {
    if (riskChart) {
        riskChart.data.datasets[0].data = [
            distribution[1],
            distribution[2],
            distribution[3],
            distribution[4],
            distribution[5]
        ];
        riskChart.update();
    }
}

async function callGemini(prompt) {
    const key = document.getElementById('apiKey').value;
    if (!key) {
        alert("Please enter your Gemini API Key first.");
        throw new Error("No API Key");
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error.message || "API Error");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

async function analyzeDomain(domain) {
    const modal = document.getElementById('aiModal');
    const content = document.getElementById('aiResponse');
    modal.style.display = 'flex';
    content.innerHTML = '<div class="loading-spinner"></div> Analyzing...';

    const prompt = `Explain what the website "${domain}" is. Is it safe for children? 
    If it is risky, explain why briefly.
    Format your answer in simple HTML (no markdown code blocks).`;

    try {
        let result = await callGemini(prompt);
        // Strip markdown code blocks if present
        result = result.replace(/```html/g, '').replace(/```/g, '');
        content.innerHTML = result;
    } catch (e) {
        content.innerHTML = `<p style="color:red">Error: ${e.message}</p>`;
    }
}
