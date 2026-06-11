// Srishti AI - Central Coordinator & Debate Engine

// Global State
let state = {
  agents: [],
  settings: {
    rounds: 2,
    forceSimulation: false,
  },
  currentState: "idle", // 'idle' | 'brainstorming' | 'debating' | 'synthesizing' | 'done'
  currentPrompt: "",
  discussionLogs: [],
  finalVerdict: "",
  activeEditAgentId: null,
};

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  loadAgents();

  // Show auth screen or main app depending on login state
  const loggedIn = initAuthUI(() => {
    // Callback after successful login/signup
    initUI();
    updateStatusIndicator();
  });

  if (loggedIn) {
    initUI();
    updateStatusIndicator();
  }
});

// Load Settings from LocalStorage
function loadSettings() {
  const savedSettings = localStorage.getItem("srishti_settings");
  if (savedSettings) {
    try {
      state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
  }
}

// Save Settings to LocalStorage
function saveSettings() {
  localStorage.setItem("srishti_settings", JSON.stringify(state.settings));
  updateStatusIndicator();
}

// Load Agents from LocalStorage or fall back to Default Agents
function loadAgents() {
  const savedAgents = localStorage.getItem("srishti_agents");
  if (savedAgents) {
    try {
      state.agents = JSON.parse(savedAgents);
    } catch (e) {
      console.error("Failed to parse agents", e);
      state.agents = JSON.parse(JSON.stringify(DEFAULT_AGENTS));
    }
  } else {
    state.agents = JSON.parse(JSON.stringify(DEFAULT_AGENTS));
  }
}

// Save Agents to LocalStorage
function saveAgents() {
  localStorage.setItem("srishti_agents", JSON.stringify(state.agents));
  renderAgentList();
}

// Initialize UI Elements and Event Listeners
function initUI() {
  // Sliders & Toggles
  const roundsSlider = document.getElementById("input-rounds");
  const roundsVal = document.getElementById("rounds-val");
  const toggleSim = document.getElementById("toggle-simulation");

  roundsSlider.value = state.settings.rounds;
  roundsVal.textContent = state.settings.rounds;
  toggleSim.checked = state.settings.forceSimulation;

  roundsSlider.addEventListener("input", (e) => {
    state.settings.rounds = parseInt(e.target.value);
    roundsVal.textContent = e.target.value;
    saveSettings();
  });

  toggleSim.addEventListener("change", (e) => {
    state.settings.forceSimulation = e.target.checked;
    saveSettings();
  });

  // Chat Input Setup
  const chatInput = document.getElementById("chat-input");
  const btnSend = document.getElementById("btn-send");

  chatInput.addEventListener("input", () => {
    // Auto grow textarea height
    chatInput.style.height = "auto";
    chatInput.style.height = chatInput.scrollHeight - 16 + "px";
    btnSend.disabled = chatInput.value.trim() === "";
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.value.trim() !== "" && state.currentState === "idle") {
        submitPrompt(chatInput.value.trim());
      }
    }
  });

  btnSend.addEventListener("click", () => {
    if (chatInput.value.trim() !== "" && state.currentState === "idle") {
      submitPrompt(chatInput.value.trim());
    }
  });

  // Presets
  document.querySelectorAll(".preset-card").forEach((card) => {
    card.addEventListener("click", () => {
      const prompt = card.getAttribute("data-prompt");
      chatInput.value = prompt;
      chatInput.style.height = "auto";
      chatInput.style.height = chatInput.scrollHeight - 16 + "px";
      btnSend.disabled = false;
      chatInput.focus();
    });
  });

  // Reset button
  document.getElementById("btn-reset").addEventListener("click", resetArena);

  // Logout button
  document.getElementById("btn-logout").addEventListener("click", () => {
    logoutUser();
    // Reset state
    state.currentState = "idle";
    state.discussionLogs = [];
    state.finalVerdict = "";
    // Show auth screen
    document.getElementById("app-container-main").classList.add("hidden");
    document.getElementById("auth-screen").classList.remove("hidden");
    initAuthUI(() => {
      initUI();
      updateStatusIndicator();
    });
  });

  // Sidebar tabs (Agents / History)
  const tabAgents = document.getElementById("stab-agents");
  const tabHistory = document.getElementById("stab-history");
  const panelAgents = document.getElementById("panel-agents");
  const panelHistory = document.getElementById("panel-history");

  tabAgents?.addEventListener("click", () => {
    tabAgents.classList.add("active");
    tabHistory.classList.remove("active");
    panelAgents.classList.remove("hidden");
    panelHistory.classList.add("hidden");
  });

  tabHistory?.addEventListener("click", () => {
    tabHistory.classList.add("active");
    tabAgents.classList.remove("active");
    panelHistory.classList.remove("hidden");
    panelAgents.classList.add("hidden");
  });

  // Modals Handling
  setupModals();

  // Render agents side listing
  renderAgentList();

  // Final actions
  document.getElementById("btn-copy").addEventListener("click", copyMarkdown);
  document
    .getElementById("btn-download")
    .addEventListener("click", downloadMarkdown);

  // ─────────────────────────────────────────────────
  // Voice Input (Speech-to-Text)
  // ─────────────────────────────────────────────────
  setupVoiceInput();
}

function setupVoiceInput() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    // Browser doesn't support Web Speech API
    const micBtn = document.getElementById("btn-mic");
    if (micBtn) {
      micBtn.disabled = true;
      micBtn.title = "Voice input not supported in this browser";
      micBtn.style.opacity = "0.4";
      micBtn.style.cursor = "not-allowed";
    }
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;

  let isListening = false;

  const micBtn = document.getElementById("btn-mic");
  const micIconDefault = document.getElementById("mic-icon-default");
  const micIconActive = document.getElementById("mic-icon-active");
  const voiceStatusBar = document.getElementById("voice-status-bar");
  const voiceStatusText = document.getElementById("voice-status-text");
  const btnStopVoice = document.getElementById("btn-stop-voice");
  const chatInput = document.getElementById("chat-input");
  const btnSend = document.getElementById("btn-send");

  function startListening() {
    if (isListening) return;
    try {
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition start error:", err);
    }
  }

  function stopListening() {
    if (!isListening) return;
    recognition.stop();
  }

  function setListeningUI(listening) {
    isListening = listening;
    if (listening) {
      micBtn.classList.add("recording");
      micIconDefault.classList.add("hidden");
      micIconActive.classList.remove("hidden");
      voiceStatusBar.classList.remove("hidden");
      voiceStatusText.textContent = "Listening... speak now";
    } else {
      micBtn.classList.remove("recording");
      micIconDefault.classList.remove("hidden");
      micIconActive.classList.add("hidden");
      voiceStatusBar.classList.add("hidden");
    }
  }

  recognition.addEventListener("start", () => {
    setListeningUI(true);
  });

  recognition.addEventListener("result", (event) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Show interim results in the status bar
    if (interimTranscript) {
      voiceStatusText.textContent = interimTranscript;
    }

    // When finalized, inject into chat input
    if (finalTranscript) {
      const currentVal = chatInput.value.trim();
      chatInput.value = currentVal
        ? currentVal + " " + finalTranscript
        : finalTranscript;
      // Trigger input event so the send button enables
      chatInput.dispatchEvent(new Event("input"));
      voiceStatusText.textContent = "Transcribed! Review your text below.";
    }
  });

  recognition.addEventListener("end", () => {
    setListeningUI(false);
  });

  recognition.addEventListener("error", (event) => {
    console.warn("Speech recognition error:", event.error);
    setListeningUI(false);
    if (event.error === "not-allowed") {
      voiceStatusText.textContent =
        "Microphone permission denied. Please allow microphone access.";
      voiceStatusBar.classList.remove("hidden");
      setTimeout(() => voiceStatusBar.classList.add("hidden"), 4000);
    } else if (event.error === "no-speech") {
      voiceStatusText.textContent = "No speech detected. Try again.";
      voiceStatusBar.classList.remove("hidden");
      setTimeout(() => voiceStatusBar.classList.add("hidden"), 3000);
    } else if (event.error === "network") {
      voiceStatusText.textContent =
        "Network error. Check your internet connection.";
      voiceStatusBar.classList.remove("hidden");
      setTimeout(() => voiceStatusBar.classList.add("hidden"), 4000);
    }
  });

  // Mic button toggle
  micBtn.addEventListener("click", () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });

  // Stop voice button
  btnStopVoice.addEventListener("click", () => {
    stopListening();
  });
}

// Render Agent Listing in Sidebar
function renderAgentList() {
  const listContainer = document.getElementById("agents-list");
  listContainer.innerHTML = "";

  // Exclude the hidden Synthesizer Core from the main configuration sidebar
  const configAgents = state.agents.filter((a) => !a.isSynthesizer);

  configAgents.forEach((agent) => {
    const providerMeta = PROVIDERS[agent.provider] || {
      name: agent.provider,
      color: "#aaa",
    };

    const card = document.createElement("div");
    card.className = `agent-card ${agent.active ? "active-state" : "inactive-state"}`;
    card.style.setProperty("--card-color", providerMeta.color);
    card.setAttribute("data-id", agent.id);

    card.innerHTML = `
            <div class="agent-card-header">
                <div class="agent-avatar">${agent.avatar || "🤖"}</div>
                <div class="agent-meta">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-role">${agent.role}</div>
                </div>
                <label class="switch agent-toggle" title="Toggle Active">
                    <input type="checkbox" class="toggle-agent-active" data-id="${agent.id}" ${agent.active ? "checked" : ""}>
                    <span class="slider-round"></span>
                </label>
            </div>
            <div class="agent-badge-row">
                <span class="agent-provider-badge" style="background-color: ${providerMeta.color}">
                    ${providerMeta.name}
                </span>
                <span class="agent-model-name text-muted" style="font-size: 10px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${agent.model.split("/").pop()}
                </span>
            </div>
        `;

    // Card click triggers editing (but ignore if clicked directly on toggle switch)
    card.addEventListener("click", (e) => {
      if (e.target.closest(".agent-toggle")) return;
      openEditAgentModal(agent.id);
    });

    // Toggle switch changes state
    card
      .querySelector(".toggle-agent-active")
      .addEventListener("change", (e) => {
        const agentId = e.target.getAttribute("data-id");
        const ag = state.agents.find((a) => a.id === agentId);
        if (ag) {
          ag.active = e.target.checked;
          saveAgents();
        }
      });

    listContainer.appendChild(card);
  });
}

// Modals Trigger and Events Setup
function setupModals() {
  // API Modal
  const modalApi = document.getElementById("modal-api-keys");
  const btnApi = document.getElementById("btn-api-keys");
  const btnSaveKeys = document.getElementById("btn-save-keys");

  btnApi.addEventListener("click", () => {
    // Load existing keys into fields
    Object.keys(PROVIDERS).forEach((provider) => {
      const input = document.getElementById(`key-${provider}`);
      if (input) {
        input.value = getStoredApiKey(provider);
      }
    });
    modalApi.classList.remove("hidden");
  });

  btnSaveKeys.addEventListener("click", () => {
    Object.keys(PROVIDERS).forEach((provider) => {
      const input = document.getElementById(`key-${provider}`);
      if (input) {
        setStoredApiKey(provider, input.value);
      }
    });
    modalApi.classList.add("hidden");
    updateStatusIndicator();
  });

  // Close buttons on all modals
  document.querySelectorAll(".btn-close-modal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.target.closest(".modal-overlay").classList.add("hidden");
    });
  });

  // Add Agent Button
  document.getElementById("btn-add-agent").addEventListener("click", () => {
    openEditAgentModal(null); // Null means create new
  });

  // Dynamic Select Filtering inside Edit Agent Modal
  const providerSelect = document.getElementById("edit-agent-provider");
  const modelSelect = document.getElementById("edit-agent-model");

  providerSelect.addEventListener("change", (e) => {
    populateModelDropdown(e.target.value);
  });

  // Save Agent button
  document
    .getElementById("btn-save-agent")
    .addEventListener("click", saveAgentSettings);

  // Delete Agent button
  document
    .getElementById("btn-delete-agent")
    .addEventListener("click", deleteAgentSettings);
}

// Populate Provider Dropdown inside modal
function populateProviderDropdown(selectedProvider) {
  const providerSelect = document.getElementById("edit-agent-provider");
  providerSelect.innerHTML = "";

  Object.entries(PROVIDERS).forEach(([key, meta]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = meta.name;
    if (key === selectedProvider) opt.selected = true;
    providerSelect.appendChild(opt);
  });
}

// Populate Model Dropdown based on selected Provider
function populateModelDropdown(providerKey, selectedModel) {
  const modelSelect = document.getElementById("edit-agent-model");
  modelSelect.innerHTML = "";

  const meta = PROVIDERS[providerKey];
  if (meta && meta.models) {
    meta.models.forEach((model) => {
      const opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = model.name;
      if (model.id === (selectedModel || meta.defaultModel))
        opt.selected = true;
      modelSelect.appendChild(opt);
    });
  }
}

// Open Edit/Create Agent Modal
function openEditAgentModal(agentId) {
  state.activeEditAgentId = agentId;

  const modal = document.getElementById("modal-agent-edit");
  const title = document.getElementById("agent-modal-title");
  const btnDelete = document.getElementById("btn-delete-agent");

  // Form inputs
  const inputId = document.getElementById("edit-agent-id");
  const inputName = document.getElementById("edit-agent-name");
  const inputAvatar = document.getElementById("edit-agent-avatar");
  const inputPrompt = document.getElementById("edit-agent-prompt");

  if (agentId) {
    // Edit Mode
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent) return;

    title.textContent = `Configure ${agent.name}`;
    inputId.value = agent.id;
    inputName.value = agent.name;
    inputAvatar.value = agent.avatar || "🤖";
    inputPrompt.value = agent.prompt;

    populateProviderDropdown(agent.provider);
    populateModelDropdown(agent.provider, agent.model);

    btnDelete.classList.remove("hidden");
  } else {
    // Create Mode
    title.textContent = "Create Custom Agent";
    inputId.value = "";
    inputName.value = "";
    inputAvatar.value = "🤖";
    inputPrompt.value =
      "You are a specialized AI assistant. Help the user by analyzing their task from your unique perspective.";

    populateProviderDropdown("gemini");
    populateModelDropdown("gemini");

    btnDelete.classList.add("hidden");
  }

  modal.classList.remove("hidden");
}

// Save Agent Settings from Modal Form
function saveAgentSettings(e) {
  e.preventDefault();
  const form = document.getElementById("agent-form");
  if (!form.reportValidity()) return;

  const id = document.getElementById("edit-agent-id").value;
  const name = document.getElementById("edit-agent-name").value;
  const avatar = document.getElementById("edit-agent-avatar").value;
  const provider = document.getElementById("edit-agent-provider").value;
  const model = document.getElementById("edit-agent-model").value;
  const prompt = document.getElementById("edit-agent-prompt").value;

  if (id) {
    // Update
    const agent = state.agents.find((a) => a.id === id);
    if (agent) {
      agent.name = name;
      agent.avatar = avatar;
      agent.provider = provider;
      agent.model = model;
      agent.prompt = prompt;
    }
  } else {
    // Create New
    const newId = `agent-${Date.now()}`;
    state.agents.push({
      id: newId,
      name,
      avatar,
      provider,
      model,
      prompt,
      color: provider,
      active: true,
    });
  }

  saveAgents();
  document.getElementById("modal-agent-edit").classList.add("hidden");
}

// Delete Agent from settings
function deleteAgentSettings(e) {
  e.preventDefault();
  const id = document.getElementById("edit-agent-id").value;
  if (!id) return;

  if (confirm("Are you sure you want to delete this agent?")) {
    state.agents = state.agents.filter((a) => a.id !== id);
    saveAgents();
    document.getElementById("modal-agent-edit").classList.add("hidden");
  }
}

// Update Status Bar connection indicator
function updateStatusIndicator() {
  const indicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");

  if (state.settings.forceSimulation) {
    indicator.className = "status-indicator warning";
    statusText.textContent = "Simulation Mode Forced (Bypassing Keys)";
    return;
  }

  const loadedKeys = [];
  Object.keys(PROVIDERS).forEach((provider) => {
    if (getStoredApiKey(provider) !== "") {
      loadedKeys.push(PROVIDERS[provider].name);
    }
  });

  if (loadedKeys.length > 0) {
    indicator.className = "status-indicator success";
    statusText.textContent = `API Keys Connected: ${loadedKeys.join(", ")}`;
  } else {
    indicator.className = "status-indicator warning";
    statusText.textContent = "Simulation Mode (No Keys Loaded)";
  }
}

// Submit a prompt to start debate
function submitPrompt(prompt) {
  state.currentState = "brainstorming";
  state.currentPrompt = prompt;
  state.discussionLogs = [];
  state.finalVerdict = "";

  // Disable chat input and settings in sidebar
  document.getElementById("chat-input").disabled = true;
  document.getElementById("btn-send").disabled = true;
  document.getElementById("btn-reset").disabled = true;
  document.getElementById("input-rounds").disabled = true;
  document.getElementById("toggle-simulation").disabled = true;

  // Toggle active state checkbox clicks during debate
  document
    .querySelectorAll(".toggle-agent-active")
    .forEach((chk) => (chk.disabled = true));

  // Switch workspace views
  document.getElementById("idle-view").classList.add("hidden");
  document.getElementById("active-view").classList.remove("hidden");

  // Reset discussion feeds
  document.getElementById("discussion-feed").innerHTML = "";
  document.getElementById("markdown-container").innerHTML = "";

  const finalCard = document.getElementById("final-output-card");
  finalCard.className = "final-output-card empty";
  document.getElementById("final-placeholder-text").textContent =
    "Waiting for agents to conclude their discussion...";
  document.getElementById("synth-spinner").classList.add("hidden");
  document.getElementById("final-actions-buttons").classList.add("hidden");

  // Build list of participating agents
  const activeAgents = state.agents.filter((a) => a.active && !a.isSynthesizer);

  if (activeAgents.length === 0) {
    // Fallback: Enable Lead Architect automatically if no agents are active
    const arch = state.agents.find((a) => a.id === "agent-architect");
    if (arch) {
      arch.active = true;
      saveAgents();
    }
  }

  // Add Synthesizer to participating list for layout drawing
  const synthAgent =
    state.agents.find((a) => a.isSynthesizer) ||
    DEFAULT_AGENTS.find((a) => a.isSynthesizer);

  // Draw Network Graph
  drawNetworkGraph(activeAgents, synthAgent);

  // Start Debate Loop (wrapped in catch to prevent silent failures)
  runDebateSequence(prompt, activeAgents, synthAgent).catch((err) => {
    console.error("Debate sequence failed:", err);
    // Show error on screen so user can see it
    const feed = document.getElementById("discussion-feed");
    if (feed) {
      feed.innerHTML = `
        <div style="padding:20px; color:#fca5a5; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:12px; margin:10px;">
          <strong>⚠️ An error occurred:</strong><br><br>
          <span style="font-family:monospace; font-size:13px;">${err.message || err}</span><br><br>
          <em style="color:#94a3b8;">Tip: Make sure "Force Simulation Mode" is ON in the sidebar if you have no API keys.</em>
        </div>`;
    }
    // Re-enable UI so user can try again
    state.currentState = "idle";
    document.getElementById("chat-input").disabled = false;
    document.getElementById("btn-send").disabled = true;
    document.getElementById("btn-reset").disabled = false;
    document.getElementById("input-rounds").disabled = false;
    document.getElementById("toggle-simulation").disabled = false;
  });
}

// Reset Arena state to Idle
function resetArena() {
  state.currentState = "idle";
  state.currentPrompt = "";
  state.discussionLogs = [];
  state.finalVerdict = "";

  // Enable inputs
  document.getElementById("chat-input").disabled = false;
  document.getElementById("chat-input").value = "";
  document.getElementById("chat-input").style.height = "auto";
  document.getElementById("btn-send").disabled = true;
  document.getElementById("btn-reset").disabled = false;
  document.getElementById("input-rounds").disabled = false;
  document.getElementById("toggle-simulation").disabled = false;
  document
    .querySelectorAll(".toggle-agent-active")
    .forEach((chk) => (chk.disabled = false));

  // Swap panels
  document.getElementById("idle-view").classList.remove("hidden");
  document.getElementById("active-view").classList.add("hidden");

  // Reset Progress bar stepper
  document
    .querySelectorAll(".progress-step")
    .forEach((step) => step.classList.remove("active"));
  document.getElementById("step-prompt").classList.add("active");
  document
    .querySelectorAll(".progress-line")
    .forEach((line) => line.classList.remove("filled"));

  // Clear SVG graph
  document.getElementById("graph-links").innerHTML = "";
  document.getElementById("graph-nodes").innerHTML = "";
  document.getElementById("graph-particles").innerHTML = "";
}

// ----------------------------------------------------
// SVG Graph Layout & Network Particle Animations
// ----------------------------------------------------

function drawNetworkGraph(activeAgents, synthAgent) {
  const svgLinks = document.getElementById("graph-links");
  const svgNodes = document.getElementById("graph-nodes");
  const svgParticles = document.getElementById("graph-particles");

  svgLinks.innerHTML = "";
  svgNodes.innerHTML = "";
  svgParticles.innerHTML = "";

  const cx = 400;
  const cy = 110;
  const radius = 80;
  const n = activeAgents.length;

  // Calculate coordinates for active agents (ring layout)
  activeAgents.forEach((agent, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2; // Start at top
    agent.cx = cx + radius * Math.cos(angle);
    agent.cy = cy + radius * Math.sin(angle);
  });

  // Synthesizer is in the center
  synthAgent.cx = cx;
  synthAgent.cy = cy;

  // 1. Draw connections
  // Connect each agent to the central Synthesizer Core
  activeAgents.forEach((agent) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", "graph-link-line");
    line.setAttribute("x1", agent.cx);
    line.setAttribute("y1", agent.cy);
    line.setAttribute("x2", synthAgent.cx);
    line.setAttribute("y2", synthAgent.cy);
    line.setAttribute("stroke", PROVIDERS[agent.provider]?.color || "#a855f7");
    line.setAttribute("stroke-width", "1.5");
    svgLinks.appendChild(line);
  });

  // Connect adjacent agents together to form a ring
  if (n > 1) {
    activeAgents.forEach((agent, i) => {
      const nextAgent = activeAgents[(i + 1) % n];
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("class", "graph-link-line");
      line.setAttribute("x1", agent.cx);
      line.setAttribute("y1", agent.cy);
      line.setAttribute("x2", nextAgent.cx);
      line.setAttribute("y2", nextAgent.cy);
      line.setAttribute("stroke", "rgba(255,255,255,0.1)");
      line.setAttribute("stroke-width", "1");
      svgLinks.appendChild(line);
    });
  }

  // 2. Draw Nodes
  // Draw Synthesizer Node first (center)
  createSVGNode(synthAgent, true);

  // Draw Active Agent Nodes
  activeAgents.forEach((agent) => {
    createSVGNode(agent, false);
  });
}

function createSVGNode(agent, isCenter) {
  const svgNodes = document.getElementById("graph-nodes");
  const glowColor = PROVIDERS[agent.provider]?.glowColor || "#fff";
  const nodeColor = PROVIDERS[agent.provider]?.color || "#aaa";

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("id", `node-${agent.id}`);
  g.setAttribute("class", "graph-node-group");

  // Pulsing circle
  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle",
  );
  circle.setAttribute("cx", agent.cx);
  circle.setAttribute("cy", agent.cy);
  circle.setAttribute("r", isCenter ? "24" : "20");
  circle.setAttribute("fill", isCenter ? "#0f172a" : "rgba(15, 23, 42, 0.9)");
  circle.setAttribute(
    "stroke",
    isCenter ? "var(--color-gemini-synth)" : nodeColor,
  );
  circle.setAttribute("stroke-width", "2.5");
  circle.setAttribute("filter", "url(#glow)");
  circle.setAttribute(
    "style",
    `--glow-color: ${isCenter ? "var(--color-gemini-synth)" : glowColor}`,
  );
  circle.setAttribute("class", "graph-node-circle");

  // Avatar emoji
  const textAvatar = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  textAvatar.setAttribute("x", agent.cx);
  textAvatar.setAttribute("y", agent.cy);
  textAvatar.setAttribute("class", "graph-node-avatar");
  textAvatar.textContent = agent.avatar || "🤖";

  // Label Text
  const textLabel = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  textLabel.setAttribute("x", agent.cx);
  textLabel.setAttribute("y", agent.cy + (isCenter ? 38 : 34));
  textLabel.setAttribute("class", "graph-node-label");
  textLabel.textContent = agent.name;

  // Role text
  const textRole = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  textRole.setAttribute("x", agent.cx);
  textRole.setAttribute("y", agent.cy + (isCenter ? 48 : 44));
  textRole.setAttribute("class", "graph-node-role");
  textRole.textContent = agent.role;

  g.appendChild(circle);
  g.appendChild(textAvatar);
  g.appendChild(textLabel);
  g.appendChild(textRole);
  svgNodes.appendChild(g);
}

// Pulse active node to show reasoning status
function setNodeThinkingState(agentId, isThinking) {
  const nodeGroup = document.getElementById(`node-${agentId}`);
  if (!nodeGroup) return;

  const circle = nodeGroup.querySelector(".graph-node-circle");
  if (!circle) return;
  if (isThinking) {
    circle.classList.add("node-thinking");
  } else {
    circle.classList.remove("node-thinking");
  }
}

// Animate a glowing particle from one agent node to another
function animateParticle(fromId, toId, color) {
  const fromNode = state.agents.find((a) => a.id === fromId);
  const toNode = state.agents.find((a) => a.id === toId);

  if (!fromNode || !toNode) return;

  const x1 = fromNode.cx;
  const y1 = fromNode.cy;
  const x2 = toNode.cx;
  const y2 = toNode.cy;

  const particle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle",
  );
  particle.setAttribute("cx", x1);
  particle.setAttribute("cy", y1);
  particle.setAttribute("r", "5");
  particle.setAttribute("fill", color || "#ffffff");
  particle.setAttribute("filter", "url(#glow-light)");

  document.getElementById("graph-particles").appendChild(particle);

  const duration = 900; // milliseconds
  const start = performance.now();

  function update(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);

    // Smooth cubic ease-in-out interpolation
    const ease =
      progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

    const cx = x1 + (x2 - x1) * ease;
    const cy = y1 + (y2 - y1) * ease;

    particle.setAttribute("cx", cx);
    particle.setAttribute("cy", cy);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      particle.remove();
    }
  }
  requestAnimationFrame(update);
}

// ----------------------------------------------------
// Debate Sequence Management
// ----------------------------------------------------

async function runDebateSequence(prompt, activeAgents, synthAgent) {
  const feed = document.getElementById("discussion-feed");
  const numRounds = state.settings.rounds;

  // --- PHASE 1: Brainstorming (Round 1) ---
  state.currentState = "brainstorming";
  updateProgressStepper("brainstorm");

  // Run parallel brainstorming for all agents
  const brainstormPromises = activeAgents.map(async (agent) => {
    // Create typing indicator card
    const cardId = `typing-${agent.id}`;
    createTypingIndicatorCard(agent, cardId);
    setNodeThinkingState(agent.id, true);

    let responseText = "";
    try {
      responseText = await callAgentAPI(agent, prompt, "");
    } catch (error) {
      responseText = `⚠️ **Error calling provider:** ${error.message}`;
    }

    // Remove typing indicator & show response
    removeTypingIndicatorCard(cardId);
    setNodeThinkingState(agent.id, false);
    appendMessageToFeed(agent, responseText, 1);

    // Log to state
    state.discussionLogs.push({
      agentId: agent.id,
      agentName: agent.name,
      role: agent.role,
      provider: agent.provider,
      text: responseText,
      round: 1,
    });

    // Trigger visual communication particle from agent to Synthesizer core
    animateParticle(
      agent.id,
      synthAgent.id,
      PROVIDERS[agent.provider]?.glowColor,
    );

    return responseText;
  });

  await Promise.all(brainstormPromises);

  // Small buffer delay between rounds
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // --- PHASE 2: Cross-Critique & Debate (Round 2+) ---
  state.currentState = "debating";
  updateProgressStepper("debate");

  for (let r = 2; r <= 1 + numRounds; r++) {
    // Compile history context for this round
    const previousRoundLogs = state.discussionLogs.filter(
      (log) => log.round === r - 1,
    );

    // Let each agent sequentially critique the arguments
    for (const agent of activeAgents) {
      // Check if user has reset or stopped the arena mid-run
      if (state.currentState === "idle") return;

      const cardId = `typing-${agent.id}`;
      createTypingIndicatorCard(agent, cardId);
      setNodeThinkingState(agent.id, true);

      // Frame critique context for the agent
      const contextText = previousRoundLogs
        .filter((log) => log.agentId !== agent.id)
        .map((log) => `[${log.agentName} - ${log.role}]:\n${log.text}`)
        .join("\n\n---\n\n");

      const critiqueInstructions = `Here are the initial blueprints and proposals suggested by other agents in the last round:\n\n${contextText}\n\nReview their suggestions. Write a detailed review critique: pointing out technical flaws, design limits, or security risks. Then update and refine your own proposal based on their inputs.`;

      let responseText = "";
      try {
        responseText = await callAgentAPI(agent, prompt, critiqueInstructions);
      } catch (error) {
        responseText = `⚠️ **Error calling provider:** ${error.message}`;
      }

      removeTypingIndicatorCard(cardId);
      setNodeThinkingState(agent.id, false);
      appendMessageToFeed(agent, responseText, r);

      // Log to state
      state.discussionLogs.push({
        agentId: agent.id,
        agentName: agent.name,
        role: agent.role,
        provider: agent.provider,
        text: responseText,
        round: r,
      });

      // Visual particle communication to other nodes
      activeAgents
        .filter((a) => a.id !== agent.id)
        .forEach((other) => {
          animateParticle(
            agent.id,
            other.id,
            PROVIDERS[agent.provider]?.glowColor,
          );
        });

      // Short delay between individual agent critique deliveries
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  // --- PHASE 3: Consensus & Synthesis ---
  state.currentState = "synthesizing";
  updateProgressStepper("synthesis");

  // Show spinner inside final card
  const finalPlaceholderText = document.getElementById(
    "final-placeholder-text",
  );
  const synthSpinner = document.getElementById("synth-spinner");
  finalPlaceholderText.textContent =
    "Synthesis Core is compiling agent arguments and drafting the final verdict...";
  synthSpinner.classList.remove("hidden");

  setNodeThinkingState(synthAgent.id, true);

  // Context compiles ALL historical comments
  const completeDiscussionContext = state.discussionLogs
    .map(
      (log) =>
        `[Round ${log.round}] [${log.agentName} - ${log.role}]:\n${log.text}`,
    )
    .join("\n\n=================================\n\n");

  const synthInstructions = `You are the final Synthesizer. Review the user's initial prompt, and review the entire multi-agent discussion transcript below:\n\n${completeDiscussionContext}\n\nYour task: Resolve any technical disputes, extract the best suggestions, eliminate weak ideas, write the complete optimized code/blueprint, and compile a single cohesive, exhaustive, production-grade Final Verdict in detailed Markdown format. Make sure it contains clean markdown tables and code blocks.`;

  let finalMarkdownText = "";
  try {
    finalMarkdownText = await callAgentAPI(
      synthAgent,
      prompt,
      synthInstructions,
    );
  } catch (error) {
    finalMarkdownText = `# Synthesis Error\n\nFailed to compile consensus. ${error.message}`;
  }

  setNodeThinkingState(synthAgent.id, false);

  // Display Final Verdict
  state.finalVerdict = finalMarkdownText;
  state.currentState = "done";

  // Hide placeholders and render markdown
  synthSpinner.classList.add("hidden");
  const finalCard = document.getElementById("final-output-card");
  finalCard.className = "final-output-card"; // remove .empty

  const mdContainer = document.getElementById("markdown-container");
  mdContainer.innerHTML = marked.parse(finalMarkdownText);

  // Apply syntax highlighting
  Prism.highlightAllUnder(mdContainer);

  // Show actions
  document.getElementById("final-actions-buttons").classList.remove("hidden");

  // Clean UI state controls
  document.getElementById("btn-reset").disabled = false;
  document.getElementById("chat-input").disabled = false;
  document.getElementById("chat-input").value = "";
  document.getElementById("chat-input").style.height = "auto";
  document.getElementById("input-rounds").disabled = false;
  document.getElementById("toggle-simulation").disabled = false;
  document
    .querySelectorAll(".toggle-agent-active")
    .forEach((chk) => (chk.disabled = false));
}

// ----------------------------------------------------
// UI Render Helpers
// ----------------------------------------------------

// Progress stepper bar active states
function updateProgressStepper(stepId) {
  const steps = ["prompt", "brainstorm", "debate", "synthesis"];
  const index = steps.indexOf(stepId);

  steps.forEach((step, i) => {
    const el = document.getElementById(`step-${step}`);
    if (i <= index) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }

    const line = document.getElementById(`line-${i}`);
    if (line) {
      if (i <= index) {
        line.classList.add("filled");
      } else {
        line.classList.remove("filled");
      }
    }
  });
}

// Create Typing bubble card
function createTypingIndicatorCard(agent, cardId) {
  const feed = document.getElementById("discussion-feed");
  const providerColor = PROVIDERS[agent.provider]?.color || "#aaa";

  const card = document.createElement("div");
  card.id = cardId;
  card.className = "message-card";
  card.style.setProperty("--message-border-color", providerColor);

  card.innerHTML = `
        <div class="message-header">
            <div class="message-agent-info">
                <span class="message-avatar">${agent.avatar || "🤖"}</span>
                <span class="message-name">${agent.name}</span>
                <span class="message-role-tag">${agent.role}</span>
            </div>
            <span class="message-provider-tag" style="background-color: ${providerColor}">
                Thinking...
            </span>
        </div>
        <div class="typing-indicator">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

  feed.appendChild(card);
  feed.scrollTop = feed.scrollHeight;
}

// Remove Typing bubble card
function removeTypingIndicatorCard(cardId) {
  const el = document.getElementById(cardId);
  if (el) el.remove();
}

// Append real message to discussion logs UI
function appendMessageToFeed(agent, text, round) {
  const feed = document.getElementById("discussion-feed");
  const providerColor = PROVIDERS[agent.provider]?.color || "#aaa";
  const providerName = PROVIDERS[agent.provider]?.name || agent.provider;

  const card = document.createElement("div");
  card.className = "message-card";
  card.style.setProperty("--message-border-color", providerColor);

  // Check round number to formulate title
  const roundTitle =
    round === 1 ? "Brainstorm Proposal" : `Critique Round ${round - 1}`;

  card.innerHTML = `
        <div class="message-header">
            <div class="message-agent-info">
                <span class="message-avatar">${agent.avatar || "🤖"}</span>
                <span class="message-name">${agent.name}</span>
                <span class="message-role-tag">${agent.role}</span>
            </div>
            <span class="message-provider-tag" style="background-color: ${providerColor}">
                ${roundTitle}
            </span>
        </div>
        <div class="message-body">${formatTextForFeed(text)}</div>
    `;

  feed.appendChild(card);
  feed.scrollTop = feed.scrollHeight;
}

// Format basic inline code and bold in speech logs so they look readable without full marked parsing
function formatTextForFeed(text) {
  // Simple sanitization
  let clean = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Format bold headers
  clean = clean.replace(/### (.*?)\n/g, "<strong>$1</strong>\n");
  clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Format inline code
  clean = clean.replace(
    /`(.*?)`/g,
    "<code style='background-color: rgba(255,255,255,0.06); padding: 1px 4px; border-radius: 4px; font-family: var(--font-mono); font-size: 11px;'>$1</code>",
  );

  return clean;
}

// ----------------------------------------------------
// Utility Functions (Actions)
// ----------------------------------------------------

function copyMarkdown() {
  if (!state.finalVerdict) return;
  navigator.clipboard
    .writeText(state.finalVerdict)
    .then(() => {
      const btn = document.getElementById("btn-copy");
      const originalText = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy", err);
    });
}

function downloadMarkdown() {
  if (!state.finalVerdict) return;

  // Clean name for file
  const cleanName = state.currentPrompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 30);

  const blob = new Blob([state.finalVerdict], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `srishti-ai-${cleanName || "verdict"}.md`;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
