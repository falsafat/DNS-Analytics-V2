# Parental Network Analysis Dashboard + AI (DNS Analytics V2)

A powerful, privacy-focused dashboard for parents to analyze network traffic logs (DNS queries) and identify potential safety risks for children. This tool uses local processing and AI integration to categorize domains, detect adult content, and provide actionable insights.

## 🚀 Key Features

*   **🛡️ Advanced Safety Scanner**: Automatically categorizes domains into 5 risk levels:
    *   **Level 5: Explicit Adult** (Block) - Known porn sites and severe content.
    *   **Level 4: Mature & Gambling** (Restrict) - Dating, gambling, drugs, and explicit acts.
    *   **Level 3: Slang & Suggestive** (Monitor) - Hidden slang, anatomy, and erotic terms.
    *   **Level 2: Suspicious** (Verify) - Ambiguous terms (e.g., "tube", "vpn").
    *   **Level 1: Safe / Clean**
*   **✨ AI Verification (Gemini)**:
    *   **Batch Verification**: Rapidly re-evaluates risky domains using Google's Gemini API to reduce false positives.
    *   **Contextual Explanations**: Provides brief reasons for risk ratings (e.g., "Explicit adult content" vs "Safe health site").
    *   **Activity Reports**: Generates an empathetic summary of internet habits and sleep schedule risks.
*   **📊 Interactive Dashboard**:
    *   **Hourly Activity Chart**: Visualizes peak usage times.
    *   **Risk Distribution Chart**: Shows the breakdown of traffic by risk level.
    *   **Top Domains**: Lists the most frequently visited sites.
*   **🎨 Premium UI**: Modern, responsive design with Dark/Light mode support and glassmorphism effects.
*   **📂 Local Processing**: Parses CSV files directly in the browser. No data is uploaded to a server (except for specific domains sent to Gemini for verification).
*   **📥 Export Reports**: Download a detailed CSV report of identified risks with AI verification status.

## 🛠️ Technology Stack

*   **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
*   **Charts**: Chart.js
*   **AI**: Google Gemini API (via direct browser call)
*   **Icons**: FontAwesome (CDN)

## ⚙️ Setup & Usage

1.  **Get a Gemini API Key**:
    *   Go to [Google AI Studio](https://aistudio.google.com/).
    *   Create a free API key.
2.  **Open the Dashboard**:
    *   Simply open `index.html` in any modern web browser.
3.  **Enter API Key**:
    *   Paste your Gemini API Key in the input field at the top right.
    *   **Note**: It will be saved locally in your browser, so you only need to do this once.
4.  **Upload Data**:
    *   Drag and drop your DNS query CSV file (Format: `Domain, Timestamp` or similar standard logs).
5.  **Analyze**:
    *   Review the charts and risk list.
    *   Click **"✨ Verify Risks with AI"** to double-check flagged domains.
    *   Click **"✨ Generate Activity Report"** for a summary of habits.

## 📦 Installation on CasaOS

This dashboard runs as a simple static website using a lightweight Nginx container.

**Step 1: Prepare the Files**
1.  Download the project source code.
2.  Open your CasaOS **Files** app.
3.  Create a new folder at: `/DATA/AppData/network-dashboard`
4.  Upload **all project files** (`index.html`, `css/` folder, `js/` folder) into this new folder.

**Step 2: Install via CasaOS**
1.  Go to the CasaOS dashboard and click the **+ (Plus)** button > **Install a Custom App**.
2.  Fill in the settings exactly as follows:

| Setting | Value |
| :--- | :--- |
| **Docker Image** | `nginx:alpine` |
| **Title** | Network Dashboard |
| **Web UI Port** | `3000` |

**Step 3: Configure Ports (Critical)**
Under the **Ports** section, ensure the mapping is correct to avoid conflicts:
*   **Host Port**: `3000` (or any free port you prefer)
*   **Container Port**: `80` (Must be 80)

**Step 4: Configure Volumes**
Under the **Volumes** section, link your file folder to the web server:
*   **Host Path**: `/DATA/AppData/network-dashboard` (Select the folder you created in Step 1)
*   **Container Path**: `/usr/share/nginx/html`

**Step 5: Finish**
Click **Install**. Once complete, open the app icon or visit `http://YOUR-IP:3000`.

## 🔒 Privacy Note

*   **Local-First**: Your full browsing history CSV is processed entirely within your browser using JavaScript. It is NOT uploaded to any backend server.
*   **AI Privacy**: Only specific domain names that you choose to verify or summarize are sent to the Google Gemini API.

## 📝 License

Personal Use / Open Source
