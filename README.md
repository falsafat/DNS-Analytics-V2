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
    *   Paste your Gemini API Key in the input field at the top right. It will be saved locally in your browser.
4.  **Upload Data**:
    *   Drag and drop your DNS query CSV file (Format: `Domain, Timestamp` or similar standard logs).
5.  **Analyze**:
    *   Review the charts and risk list.
    *   Click **"✨ Verify Risks with AI"** to double-check flagged domains.
    *   Click **"✨ Generate Activity Report"** for a summary of habits.

## 🔒 Privacy Note

*   **Local-First**: Your full browsing history CSV is processed entirely within your browser using JavaScript. It is NOT uploaded to any backend server.
*   **AI Privacy**: Only specific domain names that you choose to verify or summarize are sent to the Google Gemini API.

## 📝 License

Personal Use / Open Source
