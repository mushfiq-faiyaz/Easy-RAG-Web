// RanFie — Landing Page Scripts

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all components
  initThemeToggle();
  initScrollAnimations();
  initFaqAccordion();
  initContactForm();
  initChatDemo();
});

/* ==========================================================================
   0. THEME TOGGLE (macOS Dark Mode by Default with LocalStorage Memory)
   ========================================================================== */
function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('ranfie_theme', nextTheme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  });
}

/* ==========================================================================
   1. SOFT SCROLL ANIMATIONS (Intersection Observer)
   ========================================================================== */
function initScrollAnimations() {
  const targets = document.querySelectorAll('.fade-target');
  if (!targets.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    targets.forEach(el => observer.observe(el));
  } else {
    // Fallback for older browsers
    targets.forEach(el => el.classList.add('visible'));
  }
}

/* ==========================================================================
   2. FAQ ACCORDION
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const button = item.querySelector('.faq-question');
    if (!button) return;

    button.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other items for a clean single-open behavior
      faqItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('active');
          const otherBtn = other.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      if (isActive) {
        item.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ==========================================================================
   3. CONTACT FORM
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const feedback = document.getElementById('contactFeedback');
  const submitBtn = document.getElementById('contactSubmitBtn');

  if (!form || !feedback) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !message) {
      showFeedback('Please fill out all fields.', 'error');
      return;
    }

    // Disable button temporarily to simulate sending
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      form.reset();
      showFeedback(`Thank you, ${name}! Your message was sent. I will get back to you at ${email} within 24 hours.`, 'success');
    }, 700);
  });

  function showFeedback(text, type) {
    feedback.textContent = text;
    feedback.className = `form-feedback ${type}`;
    feedback.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        feedback.style.display = 'none';
      }, 8000);
    }
  }
}

/* ==========================================================================
   4. INTERACTIVE CHAT DEMO (Client-side PDF & Question Answering)
   ========================================================================== */
function initChatDemo() {
  // Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('pdfFileInput');
  const fileStatusBar = document.getElementById('fileStatusBar');
  const loadedFileName = document.getElementById('loadedFileName');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const useSampleBtn = document.getElementById('useSampleBtn');
  const questionCountEl = document.getElementById('questionCount');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const quickPrompts = document.getElementById('quickPrompts');

  // Constraints
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_QUESTIONS = 5;

  // State
  let activeDocument = null; // { name, pages: [], rawText }
  let questionsUsed = 0;
  let isResponding = false;

  // Sample default business guide knowledge base
  const SAMPLE_GUIDE = {
    name: 'Sample Business Guide (Acme Studio)',
    pages: [
      {
        pageNumber: 1,
        text: `Acme Studio & Services - Customer Information Guide
1. Business Hours: We are open Monday to Friday, 9:00 AM to 6:00 PM EST. On Saturdays, we are open 10:00 AM to 2:00 PM. We are closed on Sundays and national holidays.
2. Pricing and Services: Our standard service package starts at $99. Hourly consultations are $45. We accept Visa, Mastercard, American Express, and PayPal. All prices include applicable taxes.
3. Refund Policy: We offer a 100% money-back guarantee within 14 days of purchase if you are not fully satisfied with our service.
4. Support & Response Time: Our support team responds to all email and ticket requests within 24 hours during business days.
5. Location & Service Area: We operate worldwide for digital clients and have an office at 124 Market Street, Suite 400.`
      }
    ]
  };

  // Setup PDF.js worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // Auto-load sample guide so visitor can test immediately with zero friction
  loadSampleDocument(false);

  // File Upload Handlers
  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', () => {
    clearActiveDocument();
    appendBotMessage(
      'Document removed. You can upload a new PDF or click "Use sample business guide" above.',
      null
    );
  });

  useSampleBtn.addEventListener('click', () => {
    loadSampleDocument(true);
  });

  // Handle Quick Prompts
  if (quickPrompts) {
    quickPrompts.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-prompt-btn');
      if (!btn) return;
      const query = btn.getAttribute('data-query');
      if (query && !isResponding) {
        handleUserQuestion(query);
      }
    });
  }

  // Handle Form Submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query || isResponding) return;
    chatInput.value = '';
    handleUserQuestion(query);
  });

  // Process uploaded PDF
  async function handleFileUpload(file) {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert('File size exceeds the 5MB limit. Please choose a smaller document.');
      return;
    }

    // Read and parse PDF
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (!window.pdfjsLib) {
        throw new Error('PDF parser not ready');
      }

      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        pages.push({
          pageNumber: i,
          text: pageText
        });
      }

      activeDocument = {
        name: file.name,
        size: file.size,
        pages: pages
      };

      updateFileStatusUI(file.name, `${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''}`);
      appendBotMessage(
        `Loaded "${file.name}" (${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''}). What would you like to know about it?`,
        null
      );
    } catch (err) {
      console.error('Error parsing PDF:', err);
      alert('Could not read this PDF. Please check the file and try again.');
    } finally {
      fileInput.value = '';
    }
  }

  function loadSampleDocument(announce) {
    activeDocument = {
      name: SAMPLE_GUIDE.name,
      size: 1024,
      pages: SAMPLE_GUIDE.pages
    };

    updateFileStatusUI(SAMPLE_GUIDE.name, '1 page');
    if (announce) {
      appendBotMessage(
        'Sample business guide loaded! Try asking: "What are your business hours?", "What is your refund policy?", or "How much does it cost?"',
        null
      );
    }
  }

  function clearActiveDocument() {
    activeDocument = null;
    dropzone.style.display = 'block';
    fileStatusBar.classList.remove('active');
    fileInput.value = '';
  }

  function updateFileStatusUI(name, detail) {
    dropzone.style.display = 'none';
    fileStatusBar.classList.add('active');
    loadedFileName.textContent = name;
    document.getElementById('loadedFileBadge').textContent = detail;
  }

  // Question answering engine
  function handleUserQuestion(question) {
    if (questionsUsed >= MAX_QUESTIONS) {
      appendBotMessage(
        'You have reached the 5-question limit for this demo session. To get a chatbot with unlimited questions, click "Get a chatbot" below.',
        null
      );
      return;
    }

    questionsUsed++;
    questionCountEl.textContent = questionsUsed;

    // Check if limit reached
    if (questionsUsed >= MAX_QUESTIONS) {
      chatInput.placeholder = '5-question demo limit reached';
      chatInput.disabled = true;
      sendBtn.disabled = true;
    }

    // Append user message
    appendUserMessage(question);

    // Bot response with simulated gentle delay
    isResponding = true;
    showTypingIndicator();

    setTimeout(() => {
      removeTypingIndicator();
      const answer = generateAnswer(question);
      appendBotMessage(answer.text, answer.source);
      isResponding = false;
    }, 600);
  }

  function generateAnswer(query) {
    if (!activeDocument || !activeDocument.pages || activeDocument.pages.length === 0) {
      return {
        text: 'Please upload a PDF document or click "Use sample business guide" above so I can find the answer for you.',
        source: null
      };
    }

    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !isStopWord(w));

    let bestMatch = null;
    let highestScore = 0;

    // Search page by page and sentence by sentence
    for (const page of activeDocument.pages) {
      // Split into sentences / bullet points
      const sentences = page.text.split(/(?<=[.?!])\s+|\n+/);

      for (const sentence of sentences) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length < 10) continue;

        const sentLower = cleanSentence.toLowerCase();
        let score = 0;

        for (const word of queryWords) {
          if (sentLower.includes(word)) {
            score += 2;
          }
        }

        // Semantic synonym boost for common business queries
        if (queryLower.includes('hour') || queryLower.includes('time') || queryLower.includes('open') || queryLower.includes('close')) {
          if (sentLower.includes('hour') || sentLower.includes('open') || sentLower.includes('monday') || sentLower.includes('closed')) score += 3;
        }
        if (queryLower.includes('price') || queryLower.includes('cost') || queryLower.includes('fee') || queryLower.includes('how much') || queryLower.includes('pay')) {
          if (sentLower.includes('$') || sentLower.includes('price') || sentLower.includes('starts at') || sentLower.includes('paypal') || sentLower.includes('payment')) score += 3;
        }
        if (queryLower.includes('refund') || queryLower.includes('return') || queryLower.includes('cancel') || queryLower.includes('money back')) {
          if (sentLower.includes('refund') || sentLower.includes('guarantee') || sentLower.includes('money-back') || sentLower.includes('days')) score += 3;
        }
        if (queryLower.includes('where') || queryLower.includes('location') || queryLower.includes('address') || queryLower.includes('office')) {
          if (sentLower.includes('street') || sentLower.includes('suite') || sentLower.includes('location') || sentLower.includes('office')) score += 3;
        }
        if (queryLower.includes('contact') || queryLower.includes('support') || queryLower.includes('phone') || queryLower.includes('email') || queryLower.includes('call')) {
          if (sentLower.includes('email') || sentLower.includes('support') || sentLower.includes('call') || sentLower.includes('hours') || sentLower.includes('team')) score += 3;
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            text: cleanSentence,
            pageNumber: page.pageNumber
          };
        }
      }
    }

    if (highestScore >= 2 && bestMatch) {
      return {
        text: bestMatch.text,
        source: `Source: Page ${bestMatch.pageNumber}`
      };
    }

    // Polite fallback when document does not contain the answer
    return {
      text: "I couldn't find an answer to that in the uploaded document. When this happens on your live website, the chatbot collects the customer's name and contact details so you can answer them personally.",
      source: null
    };
  }

  function isStopWord(w) {
    const stops = ['the', 'and', 'for', 'are', 'you', 'with', 'what', 'how', 'can', 'does', 'your', 'about', 'this', 'that', 'have', 'from'];
    return stops.includes(w);
  }

  // DOM Helpers for Chat
  function appendUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user';
    msgDiv.innerHTML = `
      <div class="avatar avatar-user">You</div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollChatBottom();
  }

  function appendBotMessage(text, source) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot';
    let sourceHtml = '';
    if (source) {
      sourceHtml = `<div class="source-tag">${escapeHtml(source)}</div>`;
    }
    msgDiv.innerHTML = `
      <div class="avatar avatar-bot">AI</div>
      <div class="msg-bubble">
        ${escapeHtml(text)}
        ${sourceHtml}
      </div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollChatBottom();
  }

  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'message bot';
    typingDiv.innerHTML = `
      <div class="avatar avatar-bot">AI</div>
      <div class="msg-bubble" style="color: var(--text-muted); font-style: italic;">
        Reading document...
      </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollChatBottom();
  }

  function removeTypingIndicator() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
  }

  function scrollChatBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
