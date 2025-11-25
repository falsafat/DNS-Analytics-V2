// --- CONFIG & STATE ---
let CURRENT_DATA = {
    total: 0,
    blocked: 0,
    hourly: new Array(24).fill(0),
    topDomains: [],
    riskyDomains: [],
    maxRiskLevel: 1
};

// 5-Level Risk Mapping
const RISK_MAPPING = {
    5: [ // Critical: Major Sites & Severe
        "pornhub", "xvideos", "xnxx", "chaturbate", "livejasmin", "brazzers", "redtube", "youporn",
        "onlyfans", "nhentai", "sharmuta", "kantot", "iyot", "rape", "incest", "pedophile"
    ],
    4: [ // High: Explicit Acts
        "porn", "sex", "xxx", "fuck", "gangbang", "creampie", "blowjob", "cum", "orgasm",
        "bdsm", "fetish", "bondage", "bomba", "torjak", "jakol", "nik", "nekh", "jins", "ibahi"
    ],
    3: [ // Medium: Anatomy & Suggestive
        "nude", "adult", "milf", "anal", "pussy", "dick", "cock", "boobs", "tits", "booty", "ass",
        "escort", "strip", "erotic", "kink", "hentai", "titi", "etits", "pekpek", "jabol",
        "boldstar", "pokpok", "fubu", "kuss", "zebb", "siks", "tiz"
    ],
    2: [ // Low: Ambiguous
        "tube", "cam", "uncensored", "leaked", "amateur", "bold", "scandal", "pinay", "libog", "kayat", "viral", "dating"
    ]
    // Level 1 is Safe (default)
};

const RISK_CONFIG = {
    1: { label: "System Clean", color: "var(--success)", class: "risk-safe" },
    2: { label: "Low Risk Found", color: "#4dabf7", class: "risk-low" },
    3: { label: "Medium Risk Found", color: "#fcc419", class: "risk-medium" },
    4: { label: "High Risk Found", color: "#ff922b", class: "risk-high" },
    5: { label: "CRITICAL RISK", color: "var(--danger)", class: "risk-critical" }
};

let hourlyChart = null; // Chart.js instance

// --- INITIALIZATION ---
window.onload = () => {
    loadApiKey();
    loadTheme();
    setupFileUpload();

    // Initialize empty chart
    initChart();
};

// --- THEME HANDLING ---
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);

    // Update chart colors if it exists
    if (hourlyChart) {
        updateChartColors(next);
    }
}

function loadTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}

// --- GEMINI AI INTEGRATION ---
function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value;
    localStorage.setItem('gemini_api_key', key);
}

function loadApiKey() {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
        document.getElementById('apiKeyInput').value = storedKey;
    }
}

async function callGemini(prompt) {
    const apiKey = document.getElementById('apiKeyInput').value;
    if (!apiKey) {
        alert("Please enter a valid Gemini API Key in the top right corner!");
        throw new Error("No API Key");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("API Call Failed");
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

async function analyzeDomain(domain) {
    const modal = document.getElementById('aiModal');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');

    modal.style.display = 'flex';
    title.innerHTML = `✨ Analyzing: ${domain}`;
    content.innerHTML = '<div style="text-align:center"><div class="loading-spinner"></div><br>Asking Gemini...</div>';

    const prompt = `You are a network security expert for parents. Explain the domain '${domain}'. 
    1. What app or service owns it? 
    2. Is it safe for children, or is it a tracker/adult site? 
    3. What is it typically used for (e.g. video streaming, ads, background updates)? 
    Keep it brief and easy to understand.`;

    try {
        const text = await callGemini(prompt);
        content.innerText = text;
    } catch (e) {
        content.innerText = "Error: Could not connect to Gemini. Check your API Key.";
    }
}

async function generateActivityReport() {
    const reportDiv = document.getElementById('aiActivityReport');
    reportDiv.style.display = 'block';
    reportDiv.innerHTML = '<div class="loading-spinner"></div> Analyzing patterns...';

    const top5 = CURRENT_DATA.topDomains.slice(0, 5).map(d => d.name).join(", ");

    // Find peak hour
    const peakHourIndex = CURRENT_DATA.hourly.indexOf(Math.max(...CURRENT_DATA.hourly));
    const peakTime = `${peakHourIndex}:00 - ${peakHourIndex + 1}:00`;

    const prompt = `You are a helpful parenting assistant analyzing network logs. 
    Here is the data summary:
    - Top Apps/Domains: ${top5}
    - Peak Usage Hour: ${peakTime}
    - Total Queries: ${CURRENT_DATA.total}
    
    Write a short, empathetic paragraph analyzing the child's internet habits. 
    Focus specifically on sleep schedule risks if the peak usage is late at night (10PM - 6AM). 
    Suggest 1 actionable tip for the parent.`;

    try {
        const text = await callGemini(prompt);
        reportDiv.innerText = text;
    } catch (e) {
        reportDiv.innerText = "Error: Could not generate report. Check API Key.";
    }
}

// --- DASHBOARD RENDERING ---
function renderDashboard(data) {
    document.getElementById('totalQueries').innerText = data.total.toLocaleString();
    document.getElementById('blockedQueries').innerText = data.blocked.toLocaleString();

    updateChartData(data.hourly);

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
    globalBadge.style.backgroundColor = riskInfo.color; // Ensure color is applied if class isn't enough
    globalBadge.style.color = data.maxRiskLevel >= 3 ? '#000' : '#fff'; // Contrast text
    if (data.maxRiskLevel === 1) globalBadge.style.color = '#fff'; // Safe is green/white

    globalBadge.innerText = riskInfo.label;

    const riskCount = data.riskyDomains.length;
    document.getElementById('riskQueries').innerText = riskCount;
    document.getElementById('riskQueries').style.color = riskCount > 0 ? RISK_CONFIG[data.maxRiskLevel].color : 'var(--success)';

    if (riskCount > 0) {
        riskContainer.innerHTML = '';
        // Sort by risk level descending
        data.riskyDomains.sort((a, b) => b.level - a.level);

        data.riskyDomains.forEach(d => {
            const div = document.createElement('div');
            div.className = 'domain-item';
            const levelInfo = RISK_CONFIG[d.level];

            div.innerHTML = `
                <div class="domain-left">
                    <button class="ai-btn" onclick="analyzeDomain('${d.name}')">✨ Explain</button>
                    <span style="color:${levelInfo.color}; font-weight:bold;">[L${d.level}] ${d.name}</span>
                </div>
                <span class="domain-count">${d.count}</span>
            `;
            riskContainer.appendChild(div);
        });
    } else {
        riskContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">✅ No explicit adult domains found.<br><small>System Clean (Level 1)</small></div>`;
    }
}

// --- CHART.JS INTEGRATION ---
function initChart() {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const gridColor = isDark ? '#373a40' : '#dee2e6';
    const textColor = isDark ? '#c1c2c5' : '#495057';

    hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Queries',
                data: new Array(24).fill(0),
                backgroundColor: (context) => {
                    const hour = context.dataIndex;
                    // Highlight late night hours (0-6) and evening (20-23)
                    if (hour <= 6 || hour >= 22) return '#ff6b6b'; // Danger/Late
                    return '#339af0'; // Normal
                },
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: isDark ? '#25262b' : '#ffffff',
                    titleColor: isDark ? '#fff' : '#000',
                    bodyColor: isDark ? '#c1c2c5' : '#495057',
                    borderColor: gridColor,
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, maxTicksLimit: 12 }
                }
            }
        }
    });
}

function updateChartData(newData) {
    if (hourlyChart) {
        hourlyChart.data.datasets[0].data = newData;
        hourlyChart.update();
    }
}

function updateChartColors(theme) {
    if (!hourlyChart) return;
    const isDark = theme !== 'light';
    const gridColor = isDark ? '#373a40' : '#dee2e6';
    const textColor = isDark ? '#c1c2c5' : '#495057';

    hourlyChart.options.scales.y.grid.color = gridColor;
    hourlyChart.options.scales.y.ticks.color = textColor;
    hourlyChart.options.scales.x.ticks.color = textColor;
    hourlyChart.options.plugins.tooltip.backgroundColor = isDark ? '#25262b' : '#ffffff';
    hourlyChart.options.plugins.tooltip.titleColor = isDark ? '#fff' : '#000';
    hourlyChart.options.plugins.tooltip.bodyColor = isDark ? '#c1c2c5' : '#495057';
    hourlyChart.options.plugins.tooltip.borderColor = gridColor;

    hourlyChart.update();
}

// --- FILE PROCESSING ---
function setupFileUpload() {
    const input = document.getElementById('fileInput');
    input.addEventListener('change', (e) => processFile(e.target.files[0]));
    const drop = document.getElementById('dropZone');

    drop.addEventListener('dragover', (e) => {
        e.preventDefault();
        drop.style.borderColor = 'var(--accent)';
        drop.style.backgroundColor = 'var(--bg-input)';
    });

    drop.addEventListener('dragleave', (e) => {
        e.preventDefault();
        drop.style.borderColor = 'var(--border-color)';
        drop.style.backgroundColor = 'var(--bg-card)';
    });

    drop.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.style.borderColor = 'var(--border-color)';
        drop.style.backgroundColor = 'var(--bg-card)';
        if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
    });
}

function processFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const rows = text.split('\n');
        analyzeCSV(rows);
    };
    reader.readAsText(file);
}

function analyzeCSV(rows) {
    let total = 0;
    let blocked = 0;
    let domainCounts = {};
    let hourly = new Array(24).fill(0);
    let risky = [];
    let maxRisk = 1;

    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',');
        if (cols.length < 2) continue;

        total++;
        const timestamp = cols[0].replace(/"/g, '');
        const domain = cols[1].replace(/"/g, '');
        const status = cols.length > 6 ? cols[6] : '';

        if (status.includes('blocked')) blocked++;

        const rootDomain = domain.split('.').slice(-2).join('.');
        domainCounts[rootDomain] = (domainCounts[rootDomain] || 0) + 1;

        try {
            const date = new Date(timestamp);
            if (!isNaN(date)) {
                let hour = date.getHours() + 3; // +3 Timezone offset
                if (hour >= 24) hour -= 24;
                hourly[hour]++;
            }
        } catch (e) { }

        // Risk Analysis
        let domainRiskLevel = 1;

        // Check Critical (5)
        for (let kw of RISK_MAPPING[5]) {
            if (domain.includes(kw)) { domainRiskLevel = 5; break; }
        }
        // Check High (4) if not found
        if (domainRiskLevel === 1) {
            for (let kw of RISK_MAPPING[4]) {
                if (domain.includes(kw)) { domainRiskLevel = 4; break; }
            }
        }
        // Check Medium (3)
        if (domainRiskLevel === 1) {
            for (let kw of RISK_MAPPING[3]) {
                if (domain.includes(kw)) { domainRiskLevel = 3; break; }
            }
        }
        // Check Low (2)
        if (domainRiskLevel === 1) {
            for (let kw of RISK_MAPPING[2]) {
                if (domain.includes(kw) && !domain.includes('youtube')) { // Keep YouTube exception
                    domainRiskLevel = 2; break;
                }
            }
        }

        if (domainRiskLevel > 1) {
            risky.push({ name: domain, count: 1, level: domainRiskLevel });
            if (domainRiskLevel > maxRisk) maxRisk = domainRiskLevel;
        }
    }

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
        maxRiskLevel: maxRisk
    };

    renderDashboard(CURRENT_DATA);
}

function closeModal(e) {
    if (e.target.id === 'aiModal') document.getElementById('aiModal').style.display = 'none';
}
