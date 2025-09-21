const state = {
  file: null,
  text: '',
  persona: 'student',
  language: 'English',
  apiKey: '',
  hfToken: '',
  analysis: null,
  uiText: null,
};

// Language translations for interface elements
const translations = {
  English: {
    title: 'Legal Document Demystifier',
    uploadTitle: 'Upload Legal Document',
    language: 'Language',
    persona: 'Persona',
    student: 'Student',
    businessOwner: 'Business Owner',
    lawyer: 'Lawyer',
    dragDrop: 'Drag & drop a .pdf or .txt file here, or click to select.',
    analyzeBtn: 'Analyze Document',
    documentSummary: 'Document Summary',
    personaAdvice: 'Persona-Specific Advice',
    highRisk: 'High Risk',
    mediumRisk: 'Medium Risk',
    lowRisk: 'Low Risk/Helpful',
    proactiveQuestions: 'Proactive AI Questions',
    balanceChart: 'Balance Chart',
    riskHeatmap: 'Risk Heatmap',
    demystificationBoard: 'Demystification Board',
    documentRoadmap: 'Document Roadmap',
    riskAnalysis: 'Risk Analysis',
    showRiskyClauses: 'Show Risky Clauses',
    showMediumRisk: 'Show Medium Risk',
    showHelpfulClauses: 'Show Helpful Clauses',
    builtWith: 'Built with Gemini',
    giver: 'Giver',
    receiver: 'Receiver',
    severity: 'Severity',
    why: 'Why',
    excerpt: 'Excerpt',
    clause: 'Clause'
  },
};

const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const analyzeBtn = document.getElementById('analyzeBtn');
const statusEl = document.getElementById('status');
const personaEl = document.getElementById('persona');
const languageEl = document.getElementById('language');
const hfTokenInput = null;

// Debug: Check if elements are found
console.log('Language element found:', languageEl);
console.log('Persona element found:', personaEl);
const summaryContent = document.getElementById('summaryContent');
const balanceCanvas = document.getElementById('balanceChart');
const balanceSummary = document.getElementById('balanceSummary');
const proactiveList = document.getElementById('proactiveList');
const personaAdviceList = document.getElementById('personaAdviceList');
const demystification = document.getElementById('demystification');
const mermaidCode = document.getElementById('mermaidCode');
const mermaidRendered = document.getElementById('mermaidRendered');
// API key input and save button removed from HTML
const riskHighlightPanel = document.getElementById('riskHighlightPanel');
const showRiskyBtn = document.getElementById('showRiskyBtn');
const showMediumBtn = document.getElementById('showMediumBtn');
const showHelpfulBtn = document.getElementById('showHelpfulBtn');
const riskDisplay = document.getElementById('riskDisplay');

// Set the API keys directly (if needed). Leave empty if not available.
state.apiKey = 'AIzaSyCPo4voOkvnXs2DFWIpGSqstiEGZLTSM6Y';
state.hfToken = '';

personaEl.addEventListener('change', e => { state.persona = e.target.value; });
if (languageEl) {
  languageEl.addEventListener('change', async (e) => { 
    state.language = e.target.value; 
    console.log('Language changed to:', state.language);
    await updateInterfaceLanguage(state.language);
  });
}

// Function to translate text using Hugging Face models (English -> Target)
async function translateWithHF(text, targetLanguage, hfToken) {
  if (!text) return '';
  if (targetLanguage === 'English') return text;
  const model = getHFModelForTarget(targetLanguage);
  if (!model) return text;
  if (!hfToken) return text;
  try {
    let resp = await fetch('https://api-inference.huggingface.co/models/' + encodeURIComponent(model), {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + hfToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: text })
    });
    let attempts = 0;
    while (resp.status === 503 && attempts < 3) {
      await new Promise(r => setTimeout(r, 1500 * (attempts + 1)));
      attempts++;
      resp = await fetch('https://api-inference.huggingface.co/models/' + encodeURIComponent(model), {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + hfToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: text })
      });
    }
    if (!resp.ok) { throw new Error('HF translation error: ' + (await resp.text())); }
    const data = await resp.json();
    const first = Array.isArray(data) ? data[0] : data;
    return first?.translation_text || text;
  } catch (e) {
    console.error('HF translate failed', e);
    return text;
  }
}

function getHFModelForTarget(targetLanguage) {
  const map = {
    Spanish: 'Helsinki-NLP/opus-mt-en-es',
    French: 'Helsinki-NLP/opus-mt-en-fr',
    German: 'Helsinki-NLP/opus-mt-en-de',
    Italian: 'Helsinki-NLP/opus-mt-en-it',
    Portuguese: 'Helsinki-NLP/opus-mt-en-pt',
    Hindi: 'Helsinki-NLP/opus-mt-en-hi',
    Bengali: 'Helsinki-NLP/opus-mt-en-bn',
    Japanese: 'Helsinki-NLP/opus-mt-en-ja',
    Arabic: 'Helsinki-NLP/opus-mt-en-ar'
  };
  return map[targetLanguage];
}

// Function to update interface text based on selected language
async function updateInterfaceLanguage(language) {
  console.log('Updating interface to language:', language);
  
  // If English, use static translations
  if (language === 'English') {
    const t = translations.English;
    updateInterfaceElements(t);
    state.uiText = t;
    return;
  }
  // Prefer built-ins for some languages if available and no HF token
  const englishTexts = translations.English;
  if (translations[language]) {
    updateInterfaceElements(translations[language]);
    state.uiText = translations[language];
    return;
  }
  // Translate UI strings from English to target via HF
  const translatedTexts = {};
  try {
    for (const [key, value] of Object.entries(englishTexts)) {
      translatedTexts[key] = await translateWithHF(value, language, state.hfToken);
    }
    updateInterfaceElements(translatedTexts);
    state.uiText = translatedTexts;
  } catch (error) {
    console.error('Failed to translate interface (HF):', error);
    // Fallback: static if exists; else English
    const fallback = translations[language] || englishTexts;
    updateInterfaceElements(fallback);
    state.uiText = fallback;
  }
}

// Function to translate analysis results using Gemini API
async function translateAnalysisResults(analysis, targetLanguage, apiKey) {
  if (targetLanguage === 'English') return analysis;
  
  const translatedAnalysis = { ...analysis };
  
  try {
    // Translate summary
    if (analysis.summary) {
      translatedAnalysis.summary = await translateWithHF(analysis.summary, targetLanguage, state.hfToken);
    }
    
    // Translate risk analysis explanations
    if (analysis.risk_analysis && analysis.risk_analysis.length > 0) {
      for (let i = 0; i < analysis.risk_analysis.length; i++) {
        if (analysis.risk_analysis[i].explanation) {
          translatedAnalysis.risk_analysis[i].explanation = await translateWithHF(
            analysis.risk_analysis[i].explanation, targetLanguage, state.hfToken
          );
        }
      }
    }
    
    
    // Translate demystification summaries
    if (analysis.demystification && analysis.demystification.length > 0) {
      for (let i = 0; i < analysis.demystification.length; i++) {
        if (analysis.demystification[i].section) {
          translatedAnalysis.demystification[i].section = await translateWithHF(
            analysis.demystification[i].section, targetLanguage, state.hfToken
          );
        }
        if (analysis.demystification[i].summary) {
          translatedAnalysis.demystification[i].summary = await translateWithHF(
            analysis.demystification[i].summary, targetLanguage, state.hfToken
          );
        }
      }
    }
    
    // Translate balance explanation
    if (analysis.balance && analysis.balance.explanation) {
      translatedAnalysis.balance.explanation = await translateWithHF(
        analysis.balance.explanation, targetLanguage, state.hfToken
      );
    }
    
    // Translate proactive questions
    if (analysis.proactive_questions && analysis.proactive_questions.length > 0) {
      for (let i = 0; i < analysis.proactive_questions.length; i++) {
        translatedAnalysis.proactive_questions[i] = await translateWithHF(
          analysis.proactive_questions[i], targetLanguage, state.hfToken
        );
      }
    }
    
    // Translate persona-specific advice
    if (analysis.persona_advice && analysis.persona_advice.length > 0) {
      translatedAnalysis.persona_advice = [];
      for (let i = 0; i < analysis.persona_advice.length; i++) {
        const adviceItem = analysis.persona_advice[i];
        translatedAnalysis.persona_advice[i] = await translateWithHF(
          adviceItem, targetLanguage, state.hfToken
        );
      }
    }
    
    return translatedAnalysis;
  } catch (error) {
    console.error('Failed to translate analysis results:', error);
    return analysis; // Return original analysis if translation fails
  }
}

// Function to update interface elements with translated text
function updateInterfaceElements(t) {
  
  // Update main title
  document.querySelector('.brand h1').textContent = t.title;
  
  // Update upload section
  document.querySelector('.upload-panel h2').textContent = t.uploadTitle;
  document.querySelector('label[for="language"]').textContent = t.language;
  document.querySelector('label[for="persona"]').textContent = t.persona;
  
  // Update persona options
  const personaOptions = document.querySelectorAll('#persona option');
  personaOptions[0].textContent = t.student;
  personaOptions[1].textContent = t.businessOwner;
  personaOptions[2].textContent = t.lawyer;
  
  // Update drag and drop text
  document.querySelector('.upload-box p').textContent = t.dragDrop;
  
  // Update analyze button
  document.getElementById('analyzeBtn').textContent = t.analyzeBtn;
  
  // Update summary section
  document.querySelector('.summary-panel h3').textContent = t.documentSummary;
  // Update persona advice header
  const adviceHeader = document.getElementById('personaAdviceHeader');
  if (adviceHeader) adviceHeader.textContent = t.personaAdvice || 'Persona-Specific Advice';
  document.querySelector('.legend-item.high').textContent = t.highRisk;
  document.querySelector('.legend-item.medium').textContent = t.mediumRisk;
  document.querySelector('.legend-item.low').textContent = t.lowRisk;
  
  // Update grid sections
  document.querySelector('.grid .panel:nth-child(1) h3').textContent = t.proactiveQuestions;
  document.querySelector('.grid .panel:nth-child(2) h3').textContent = t.balanceChart;
  document.querySelector('.grid .panel:nth-child(3) h3').textContent = t.riskHeatmap;
  document.querySelector('.grid .panel:nth-child(4) h3').textContent = t.demystificationBoard;
  document.querySelector('.grid .panel:nth-child(5) h3').textContent = t.documentRoadmap;
  
  // Update risk analysis section
  const riskPanel = document.getElementById('riskHighlightPanel');
  if (riskPanel) {
    riskPanel.querySelector('h3').textContent = t.riskAnalysis;
    document.getElementById('showRiskyBtn').textContent = t.showRiskyClauses;
    document.getElementById('showMediumBtn').textContent = t.showMediumRisk;
    document.getElementById('showHelpfulBtn').textContent = t.showHelpfulClauses;
  }
  
  // Update footer
  document.querySelector('.footer span').textContent = t.builtWith;
}

// Initialize interface with default language after DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  await updateInterfaceLanguage(state.language);
  // Initialize Mermaid with a default diagram
  setTimeout(() => {
    if (typeof mermaid !== 'undefined') {
      renderMermaid();
    }
  }, 1000);
});

// Fallback initialization in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await updateInterfaceLanguage(state.language);
    // Initialize Mermaid with a default diagram
    setTimeout(() => {
      if (typeof mermaid !== 'undefined') {
        renderMermaid();
      }
    }, 1000);
  });
} else {
  updateInterfaceLanguage(state.language);
  // Initialize Mermaid with a default diagram
  setTimeout(() => {
    if (typeof mermaid !== 'undefined') {
      renderMermaid();
    }
  }, 1000);
}

fileInput.addEventListener('change', onFileSelected);
['dragenter','dragover'].forEach(evt => dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('drag'); }));
['dragleave','drop'].forEach(evt => dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('drag'); }));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag');
  const file = e.dataTransfer.files?.[0];
  if (file) { 
    setFile(file);
    // Also clear the file input when using drag & drop
    fileInput.value = '';
  }
});
dropZone.addEventListener('click', () => fileInput.click());

// Add a function to reset file selection
function resetFileSelection() {
  state.file = null;
  fileInput.value = '';
  analyzeBtn.disabled = true;
  statusEl.textContent = '';
  statusEl.style.color = '';
}

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) { 
    setFile(file);
    // Clear the input value to allow selecting the same file again
    e.target.value = '';
  }
}

function setFile(file) {
  // Validate file type
  const allowedTypes = ['application/pdf', 'text/plain'];
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const isValidType = allowedTypes.includes(file.type) || ['pdf', 'txt'].includes(fileExtension);
  
  if (!isValidType) {
    statusEl.innerHTML = `
      <div style="color: #d62839; background: #ffe8ea; border: 1px solid #ffd1d6; padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">⚠️</span>
        <span>Please select a PDF or TXT file</span>
      </div>
    `;
    return;
  }
  
  state.file = file;
  analyzeBtn.disabled = false;
  
  // Create enhanced file display
  const fileSize = formatFileSize(file.size);
  const fileType = fileExtension.toUpperCase();
  
  statusEl.innerHTML = `
    <div class="file-info">
      <div class="file-name">${escapeHtml(file.name)}</div>
      <div class="file-size">${fileSize}</div>
      <div class="file-type">${fileType}</div>
    </div>
  `;
  
  // Add success animation
  statusEl.style.animation = 'fadeInUp 0.5s ease';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

analyzeBtn.addEventListener('click', async () => {
  try {
    if (!state.apiKey) { return alert('Please set your Gemini API key.'); }
    if (!state.file) { return; }
    analyzeBtn.disabled = true;
    statusEl.textContent = 'Extracting text...';
    state.text = await extractText(state.file);
    statusEl.textContent = 'Analyzing with Gemini...';
    state.analysis = await analyzeWithGemini(state.text, state.persona, state.language, state.apiKey);
    
    // If language is not English, translate the analysis results
    if (state.language !== 'English') {
      statusEl.textContent = 'Translating results...';
      state.analysis = await translateAnalysisResults(state.analysis, state.language, state.apiKey);
    }
    
    statusEl.textContent = 'Rendering results...';
    renderAll(state.analysis);
    statusEl.textContent = 'Done';
  } catch (err) {
    console.error(err);
    alert('Something went wrong. See console for details.');
  } finally {
    analyzeBtn.disabled = false;
  }
});

async function extractText(file) {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'txt') {
    return await file.text();
  }
  if (ext === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map(it => it.str);
      text += strings.join(' ') + '\n';
    }
    return text;
  }
  throw new Error('Unsupported file type. Please upload .pdf or .txt');
}

async function analyzeWithGemini(documentText, persona, language, apiKey) {
  const personaInstruction = getPersonaInstruction(persona);
  const systemPrompt = `You are an expert legal analyst AI specializing in making complex legal documents simple and understandable. Read the provided legal document text and create a comprehensive analysis in ${language} language.

Return a single JSON with the following structure:
{
  "summary": "A complete plain-language summary of the document in ${language}",
  "risk_analysis": [
    {
      "text": "specific clause or section text",
      "risk_level": "high|medium|low",
      "explanation": "why this is risky/helpful in ${language}"
    }
  ],
  "demystification": [{ "section": string, "summary": string }],
  "balance": { "giver_percent": number, "receiver_percent": number, "explanation": string },
  "proactive_questions": [string],
  "persona_advice": [string],
  "mermaid": string
}

CRITICAL INSTRUCTIONS FOR SIMPLE, DETAILED ANALYSIS:

1. SUMMARY SECTION:
   - Break down the document into 3-5 clear paragraphs
   - Each paragraph should explain ONE main concept in simple terms
   - Use analogies and real-world examples (like "This is like renting an apartment, but for business")
   - Explain what each party gets and what they must do
   - Use everyday language - imagine explaining to a 12-year-old
   - Include: What is this document? Who are the parties? What are they agreeing to? What happens if someone breaks the agreement?

2. DEMYSTIFICATION SECTION:
   - Take each major section/paragraph of the document
   - Explain it in 2-3 sentences using simple words
   - Use bullet points or numbered lists
   - Include "What this means for you" explanations
   - Give examples: "For example, if you're a student, this means..."

3. RISK ANALYSIS:
   - For each risky clause, explain:
     * What the legal language actually means in plain English
     * Why it could be a problem (with real examples)
     * What you should do about it
     * How it affects your specific situation

4. LAYMAN TERMS REQUIREMENTS:
   - Replace "indemnify" with "pay for damages"
   - Replace "liability" with "responsibility for problems"
   - Replace "breach" with "breaking the agreement"
   - Replace "termination" with "ending the agreement"
   - Use "you" and "they" instead of "party A" and "party B"
   - Explain legal concepts with everyday examples

5. DETAILED EXPLANATIONS:
   - For each paragraph, provide:
     * What it says in legal terms
     * What it means in simple terms
     * Why it matters to the reader
     * What they should watch out for
     * What they can do about it

6. PERSONA-SPECIFIC ADVICE:
   - Give 5-8 very specific, actionable steps
   - Explain WHY each step matters
   - Use examples relevant to their situation
   - Make it practical and doable

Write everything as if you're explaining to a friend who has never seen a legal document before. Use simple words, short sentences, and lots of examples.

Persona guidance: ${personaInstruction}

Keep JSON strictly valid.`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\nDOCUMENT:\n" + documentText }]}],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  };

  const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + encodeURIComponent(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error('Gemini API error: ' + t);
  }
  const data = await resp.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try { return JSON.parse(raw); } catch (e) {
    const match = raw.match(/\{[\s\S]*\}$/);
    if (match) return JSON.parse(match[0]);
    throw e;
  }
}

function getPersonaInstruction(persona) {
  switch (persona) {
    case 'student':
      return `STUDENT-FRIENDLY EXPLANATIONS:
      - Use words a high school student would understand
      - Give real-life examples: "This is like when you rent a textbook, but..."
      - Explain consequences in simple terms: "If you break this rule, you might have to pay money"
      - Use "you" and "your" instead of formal language
      - Break down complex ideas into 2-3 simple points
      - Ask questions like "What does this mean for you as a student?"
      - Give practical advice: "Before signing, make sure you understand..."`;
      
    case 'business_owner':
      return `BUSINESS OWNER FOCUS:
      - Explain how each clause affects your business operations
      - Focus on money: costs, payments, penalties, profits
      - Highlight time-sensitive items: deadlines, renewal dates, notice periods
      - Explain what you can negotiate vs. what's fixed
      - Use business examples: "This is like having insurance for your business"
      - Show potential problems: "This could cost you $X if..."
      - Give action steps: "You should ask for this to be changed because..."
      - Explain legal consequences in business terms`;
      
    case 'lawyer':
      return `LEGAL PROFESSIONAL ANALYSIS:
      - Provide precise legal terminology and definitions
      - Include relevant case law references where applicable
      - Highlight due diligence requirements and red flags
      - Explain legal precedents and implications
      - Use proper legal citations and references
      - Identify potential litigation risks and mitigation strategies
      - Provide detailed legal analysis with nuanced interpretations
      - Include regulatory compliance considerations`;
      
    default:
      return `GENERAL AUDIENCE APPROACH:
      - Use clear, everyday language
      - Explain legal concepts with simple analogies
      - Break down complex ideas into digestible parts
      - Provide practical examples and scenarios
      - Focus on what the reader needs to know and do
      - Use "you" and "your" to make it personal
      - Give clear action steps and recommendations`;
  }
}

let chart;
function renderAll(analysis) {
  renderSummary(analysis);
  renderProactive(analysis?.proactive_questions || []);
  renderPersonaAdvice(analysis?.persona_advice || []);
  renderBalance(analysis?.balance);
  renderDemystification(analysis?.demystification || []);
  renderMermaid(analysis?.mermaid || `flowchart TD
    A["📄 Document Upload"] --> B["🔍 Text Extraction"]
    B --> C["🤖 AI Analysis"]
    C --> D["📊 Risk Assessment"]
    D --> E{"⚠️ Risk Level?"}
    E -->|"🔴 High Risk"| F["🚨 Immediate Review"]
    E -->|"🟡 Medium Risk"| G["⚠️ Careful Review"]
    E -->|"🟢 Low Risk"| H["✅ Standard Review"]
    F --> I["📝 Mitigation Plan"]
    G --> J["📋 Additional Checks"]
    H --> K["📋 Final Review"]
    I --> L["✅ Document Decision"]
    J --> L
    K --> L
    L --> M["📋 Sign & Execute"]
    
    style A fill:#e1f5fe
    style F fill:#ffebee
    style G fill:#fff3e0
    style H fill:#e8f5e8
    style M fill:#f3e5f5`);
}

function renderSummary(analysis) {
  if (!analysis) return;
  let html = '';
  if (analysis.summary) {
    const header = (state.uiText && state.uiText.documentSummary) || 'Document Summary';
    html += `<h4>${escapeHtml(header)}</h4>`;
    html += `<p>${escapeHtml(analysis.summary)}</p>`;
  }
  if (analysis.risk_analysis && analysis.risk_analysis.length > 0) {
    const header = (state.uiText && state.uiText.riskAnalysis) || 'Risk Analysis';
    const clauseLabel = (state.uiText && state.uiText.clause) || 'Clause';
    html += `<h4>${escapeHtml(header)}</h4>`;
    analysis.risk_analysis.forEach((item, index) => {
      const riskClass = item.risk_level === 'high' ? 'risk-high' : item.risk_level === 'medium' ? 'risk-medium' : 'risk-low';
      html += `<div class="${riskClass}">`;
      html += `<strong>${escapeHtml(clauseLabel)} ${index + 1}:</strong> ${escapeHtml(item.text)}<br>`;
      html += `<em>${escapeHtml(item.explanation)}</em>`;
      html += `</div>`;
    });
  }
  summaryContent.innerHTML = html;
}

function renderProactive(items) {
  proactiveList.innerHTML = '';
  items.forEach(q => {
    const li = document.createElement('li');
    li.textContent = q;
    proactiveList.appendChild(li);
  });
}

function renderPersonaAdvice(items) {
  if (!personaAdviceList) return;
  personaAdviceList.innerHTML = '';
  items.forEach(advice => {
    const li = document.createElement('li');
    li.textContent = advice;
    personaAdviceList.appendChild(li);
  });
}

function renderBalance(balance) {
  if (!balance) return;
  const ctx = balanceCanvas.getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [
        (state.uiText && state.uiText.giver) || 'Giver',
        (state.uiText && state.uiText.receiver) || 'Receiver'
      ],
      datasets: [{
        data: [balance.giver_percent || 50, balance.receiver_percent || 50],
        backgroundColor: ['#4f8cff', '#48d597'],
        borderWidth: 0,
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { color: '#cfd6e6' }}},
      cutout: '60%'
    }
  });
  balanceSummary.textContent = balance.explanation || '';
}


function renderDemystification(items) {
  demystification.innerHTML = '';
  
  if (!items || items.length === 0) {
    demystification.innerHTML = `
      <div style="
        text-align: center; 
        padding: 40px 20px; 
        color: var(--muted);
        background: #f9fbff;
        border-radius: 12px;
        border: 1px solid var(--border);
      ">
        <p style="margin: 0; font-size: 16px;">📋 No document sections to demystify yet</p>
        <p style="margin: 8px 0 0 0; font-size: 14px;">Upload a document to see detailed explanations</p>
      </div>
    `;
    return;
  }
  
  items.forEach((it, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'accordion-item';
    
    const header = document.createElement('div');
    header.className = 'accordion-header';
    header.innerHTML = `
      <span style="flex: 1; font-weight: 700; color: var(--text);">
        ${escapeHtml(it.section || `Section ${idx+1}`)}
      </span>
      <span style="font-size: 12px; color: var(--muted); margin-left: 12px;">
        Click to expand
      </span>
    `;
    
    const body = document.createElement('div');
    body.className = 'accordion-body';
    
    // Format the summary content with better styling
    const summary = it.summary || 'No summary available for this section.';
    body.innerHTML = `
      <div style="
        background: #ffffff;
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #e3e8f0;
        margin-bottom: 12px;
      ">
        <h4 style="margin: 0 0 12px 0; color: var(--primary); font-size: 14px; font-weight: 600;">
          📖 What this section means:
        </h4>
        <p style="margin: 0; line-height: 1.6; color: var(--text);">
          ${escapeHtml(summary)}
        </p>
      </div>
      
      <div style="
        background: #f8fafc;
        padding: 12px;
        border-radius: 6px;
        border-left: 4px solid var(--primary);
      ">
        <p style="margin: 0; font-size: 13px; color: var(--muted); font-style: italic;">
          💡 <strong>Key takeaway:</strong> This section affects your rights and responsibilities in the agreement.
        </p>
      </div>
    `;
    
    // Enhanced click handler with smooth animation
    header.addEventListener('click', () => {
      const isOpen = wrap.classList.contains('open');
      
      // Close all other accordion items
      document.querySelectorAll('.accordion-item.open').forEach(item => {
        if (item !== wrap) {
          item.classList.remove('open');
        }
      });
      
      // Toggle current item
      wrap.classList.toggle('open');
      
      // Update header text
      const statusText = header.querySelector('span:last-child');
      if (statusText) {
        statusText.textContent = wrap.classList.contains('open') ? 'Click to collapse' : 'Click to expand';
      }
    });
    
    wrap.appendChild(header);
    wrap.appendChild(body);
    demystification.appendChild(wrap);
  });
}

async function renderMermaid(code) {
  // Clean and validate the diagram code
  let diagram = code && code.trim().length ? code.trim() : `flowchart TD
    A["📄 Document Upload"] --> B["🔍 Text Extraction"]
    B --> C["🤖 AI Analysis"]
    C --> D["📊 Risk Assessment"]
    D --> E{"⚠️ Risk Level?"}
    E -->|"🔴 High Risk"| F["🚨 Immediate Review"]
    E -->|"🟡 Medium Risk"| G["⚠️ Careful Review"]
    E -->|"🟢 Low Risk"| H["✅ Standard Review"]
    F --> I["📝 Mitigation Plan"]
    G --> J["📋 Additional Checks"]
    H --> K["📋 Final Review"]
    I --> L["✅ Document Decision"]
    J --> L
    K --> L
    L --> M["📋 Sign & Execute"]
    
    style A fill:#e1f5fe
    style F fill:#ffebee
    style G fill:#fff3e0
    style H fill:#e8f5e8
    style M fill:#f3e5f5`;
  
  // Display the code
  mermaidCode.textContent = diagram;
  
  // Clear previous content
  mermaidRendered.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading diagram...</div>';
  
  try {
    // Check if Mermaid is available
    if (typeof mermaid === 'undefined') {
      throw new Error('Mermaid library not loaded');
    }
    
    // Initialize Mermaid with proper configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#2b66f6',
        primaryTextColor: '#0b1020',
        primaryBorderColor: '#1643b6',
        lineColor: '#4b5568',
        secondaryColor: '#f6f8fb',
        tertiaryColor: '#ffffff',
        background: '#ffffff',
        mainBkg: '#ffffff',
        secondBkg: '#f6f8fb',
        tertiaryBkg: '#e3e8f0'
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: false,
        curve: 'basis'
      },
      securityLevel: 'loose'
    });
    
    // Generate unique ID for each diagram
    const diagramId = 'mermaidDiagram_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Render the diagram
    const { svg } = await mermaid.render(diagramId, diagram);
    
    // Insert the SVG
    mermaidRendered.innerHTML = svg;
    
    // Add custom styling to the rendered SVG
    const svgElement = mermaidRendered.querySelector('svg');
    if (svgElement) {
      svgElement.style.maxWidth = '100%';
      svgElement.style.height = 'auto';
      svgElement.style.borderRadius = '8px';
      svgElement.style.display = 'block';
      svgElement.style.margin = '0 auto';
    }
    
  } catch (e) {
    console.error('Mermaid rendering error:', e);
    mermaidRendered.innerHTML = `
      <div style="
        color: #d62839; 
        text-align: center; 
        padding: 30px 20px; 
        background: #ffe8ea; 
        border: 1px solid #ffd1d6; 
        border-radius: 12px;
        font-family: 'Inter', sans-serif;
      ">
        <div style="font-size: 24px; margin-bottom: 12px;">⚠️</div>
        <p style="margin: 0 0 8px 0; font-weight: 600;">Failed to render diagram</p>
        <p style="margin: 0; font-size: 14px; color: #666;">${e.message || 'Unknown error occurred'}</p>
        <div style="margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px; font-family: monospace; font-size: 12px; text-align: left; overflow-x: auto;">
          <strong>Diagram Code:</strong><br>
          <pre style="margin: 8px 0 0 0; white-space: pre-wrap;">${escapeHtml(diagram)}</pre>
        </div>
      </div>
    `;
  }
}


function toast(msg) {
  statusEl.textContent = msg;
  setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 2500);
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}


