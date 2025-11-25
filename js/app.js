// --- CONFIG & STATE ---
let CURRENT_DATA = {
    total: 0,
    blocked: 0,
    hourly: new Array(24).fill(0),
    topDomains: [],
    riskyDomains: [],
    maxRiskLevel: 1,
    riskDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    filter: 'all'
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

let hourlyChart = null; // Chart.js instance
let riskChart = null; // Doughnut Chart instance

// --- INITIALIZATION ---
window.onload = () => {
    loadApiKey();
    loadTheme();
    setupFileUpload();

    // Initialize charts
    initChart();
    initRiskChart();
};

// --- THEME HANDLING ---
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);

    // Update chart colors if it exists
    if (hourlyChart) updateChartColors(next);
    if (riskChart) updateRiskChartColors(next);
}

function loadTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}

function openHelp() {
    document.getElementById('helpModal').style.display = 'flex';
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
    // Only show count for total risks, not filtered, in the KPI card?
    // Actually let's show total risks in KPI, but list shows filtered.
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
            // Fallback: Mark these as unverified or try one-by-one? 
            // For now, just log error.
        }

        processedCount += batch.length;
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1500));
    }

    // Re-evaluate max risk and distribution
    let maxRisk = 1;
    let riskDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // Filter out Level 1s from risky list if they were downgraded
    CURRENT_DATA.riskyDomains = CURRENT_DATA.riskyDomains.filter(d => {
        if (d.level === 1) return false; // Remove safe domains
        return true;
    });

    CURRENT_DATA.riskyDomains.forEach(d => {
        if (d.level > maxRisk) maxRisk = d.level;
        riskDist[d.level] = (riskDist[d.level] || 0) + 1; // Count unique domains per level
    });

    // We need to re-calculate distribution properly including non-risky? 
    // Actually riskDistribution in CURRENT_DATA was counting *queries* or *domains*?
    // In analyzeCSV it was counting queries per level. 
    // For simplicity here, let's just update the distribution based on the remaining risky domains
    // and assume the rest are Level 1. This is a simplification but works for the chart.

    // Better approach: Reset distribution and re-tally
    // But we don't have the full dataset here easily. 
    // Let's just update the risky parts of the distribution.

    CURRENT_DATA.maxRiskLevel = maxRisk > 1 ? maxRisk : 1;

    // Update chart data for risky levels
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

function initRiskChart() {
    const ctx = document.getElementById('riskChart').getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    riskChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Safe', 'Low', 'Medium', 'High', 'Critical'],
            datasets: [{
                data: [100, 0, 0, 0, 0], // Default
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
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: isDark ? '#c1c2c5' : '#495057' }
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

function updateRiskChartColors(theme) {
    if (!riskChart) return;
    const isDark = theme !== 'light';
    riskChart.options.plugins.legend.labels.color = isDark ? '#c1c2c5' : '#495057';
    riskChart.update();
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
    let riskDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

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

        riskDist[domainRiskLevel]++;

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
        maxRiskLevel: maxRisk,
        riskDistribution: riskDist,
        filter: 'all'
    };

    renderDashboard(CURRENT_DATA);
}

function closeModal(e) {
    if (e.target.id === 'aiModal') document.getElementById('aiModal').style.display = 'none';
}
