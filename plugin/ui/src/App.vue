<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Issue {
  id: string;
  nodeId: string;
  nodeName: string;
  ruleId: string;
  ruleName: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  description: string;
  suggestedFix?: string;
  status: "OPEN" | "RESOLVED" | "IGNORED";
}

// Checks if the suggested fix is an in-place string replacement (bullets, asterisks, masked cards)
const isAutoFixable = (fix?: string): boolean => {
  if (!fix) return false;
  // If it's pure bullets, asterisks, numbers, or spaces (e.g. "••••••••" or "•••• •••• 1234")
  return /^[\u2022\u25CF*•\s\d]+$/.test(fix.trim()) || fix.length <= 20 && !fix.includes(" ");
};

// Manually mark an advisory issue as resolved
const markResolved = (issue: Issue) => {
  issue.status = "RESOLVED";
};

// Safe storage helper (prevents crashing inside Figma data: URLs)
const getStoredToken = (): string => {
  try {
    return window.localStorage?.getItem("ds_token") || "";
  } catch {
    return ""; // Safely fallback to empty in sandboxed environments
  }
};

const setStoredToken = (val: string): void => {
  try {
    window.localStorage?.setItem("ds_token", val);
  } catch {
    // Ignore storage restriction in data: URL
  }
};

// State
const token = ref<string>(getStoredToken());
const email = ref("designer@acme.com");
const password = ref("SuperSecretPassword123");
const isAuthenticated = ref(!!token.value);
const isScanning = ref(false);
const issues = ref<Issue[]>([]);
const activeTab = ref<"ALL" | "CRITICAL" | "HIGH">("ALL");

// 1. Authentication
const handleLogin = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    const data = await res.json();
    if (data.success) {
      token.value = data.data.token;
      setStoredToken(token.value);
      isAuthenticated.value = true;
    } else {
      alert("Login failed: " + data.error.message);
    }
  } catch (err) {
    alert("Cannot connect to backend: Make sure http://localhost:5000 is running!");
  }
};

// 2. Request Figma Sandbox to gather canvas nodes
const startAudit = () => {
  isScanning.value = true;
  // Send message to Figma sandbox (code.ts)
  parent.postMessage({ pluginMessage: { type: "REQUEST_SCAN_NODES" } }, "*");
};

// 3. Zoom into node on canvas
const focusNode = (nodeId: string) => {
  parent.postMessage({ pluginMessage: { type: "FOCUS_NODE", payload: { nodeId } } }, "*");
};

// 4. Apply Fix directly to canvas
const applyFix = (issue: Issue) => {
  if (!issue.suggestedFix) return;
  parent.postMessage(
    {
      pluginMessage: {
        type: "APPLY_FIX",
        payload: {
          nodeId: issue.nodeId,
          replacementText: issue.suggestedFix,
        },
      },
    },
    "*"
  );
};

// 5. Listen for messages from Figma Sandbox (code.ts)
onMounted(() => {
  window.onmessage = async (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    // A. Received canvas nodes from sandbox -> Send to backend linter
    if (msg.type === "CANVAS_NODES_PAYLOAD") {
      try {
        const res = await fetch("http://localhost:5000/api/scans", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.value}`,
          },
          body: JSON.stringify(msg.payload),
        });

        const data = await res.json();
        if (data.success) {
          issues.value = data.data.scan.issues;
        } else {
          alert("Scan error: " + data.error.message);
        }
      } catch (err) {
        alert("Scan request failed to reach backend.");
      } finally {
        isScanning.value = false;
      }
    }

    // B. Sandbox successfully mutated the layer -> Mark as resolved locally
    if (msg.type === "FIX_APPLIED_SUCCESS") {
      const fixedIssue = issues.value.find((i) => i.nodeId === msg.payload.nodeId);
      if (fixedIssue) {
        fixedIssue.status = "RESOLVED";
      }
    }
  };
});
</script>

<template>
  <div class="plugin-container">
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <span class="shield-icon">🛡️</span>
        <div>
          <h1 class="title">DesignShield</h1>
          <p class="subtitle">Security & Privacy Linter</p>
        </div>
      </div>
      <button v-if="isAuthenticated" @click="startAudit" :disabled="isScanning" class="btn-primary">
        {{ isScanning ? "Auditing..." : "Audit Canvas" }}
      </button>
    </header>

    <!-- Login Screen -->
    <div v-if="!isAuthenticated" class="auth-box">
      <h2>Connect to DesignShield</h2>
      <p class="auth-hint">Sign in with your team credentials to run security audits.</p>
      <input v-model="email" type="email" placeholder="Email" class="input" />
      <input v-model="password" type="password" placeholder="Password" class="input" />
      <button @click="handleLogin" class="btn-primary w-full">Sign In</button>
    </div>

    <!-- Audit Results Screen -->
    <div v-else class="content">
      <!-- Summary Bar -->
      <div v-if="issues.length > 0" class="summary-bar">
        <span>Found <strong>{{ issues.length }}</strong> security issues</span>
        <span class="resolved-count">
          {{ issues.filter(i => i.status === 'RESOLVED').length }} fixed
        </span>
      </div>

      <!-- Empty State -->
      <div v-if="issues.length === 0 && !isScanning" class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>No active issues</h3>
        <p>Select a frame or click "Audit Canvas" to run a security and privacy scan.</p>
      </div>

      <!-- Issue Cards List -->
      <div class="issues-list">
        <div
          v-for="issue in issues"
          :key="issue.id"
          class="issue-card"
          :class="[issue.severity.toLowerCase(), { resolved: issue.status === 'RESOLVED' }]"
        >
          <div class="issue-header">
            <span class="badge" :class="issue.severity.toLowerCase()">{{ issue.severity }}</span>
            <span class="node-tag" @click="focusNode(issue.nodeId)" title="Click to zoom in Figma">
              🎯 {{ issue.nodeName }}
            </span>
          </div>

          <h4 class="rule-title">{{ issue.ruleName }}</h4>
          <p class="description">{{ issue.description }}</p>

          <div v-if="issue.suggestedFix" class="fix-box">
            <span class="fix-label">Suggested Fix:</span>
            <code>{{ issue.suggestedFix }}</code>
          </div>

                    <div class="card-footer">
            <!-- Case 1: Direct in-place mutation (Bullets / Masking) -->
            <button
              v-if="isAutoFixable(issue.suggestedFix) && issue.status === 'OPEN'"
              @click="applyFix(issue)"
              class="btn-fix"
            >
              ⚡ Auto-Mask on Canvas
            </button>

            <!-- Case 2: Architectural AI Advisory (Requires designer to add components) -->
            <div v-else-if="issue.status === 'OPEN'" class="advisory-actions">
              <span class="advisory-label">💡 Design Advisory</span>
              <button @click="markResolved(issue)" class="btn-secondary">
                Acknowledge & Mark Done
              </button>
            </div>

            <!-- Case 3: Resolved -->
            <span v-else class="resolved-badge">
              ✔ Resolved
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plugin-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff;
  color: #09090b;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e4e4e7;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shield-icon {
  font-size: 16px;
  filter: grayscale(100%);
}

.title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #000000;
  text-transform: uppercase;
}

.subtitle {
  font-size: 10px;
  color: #71717a;
}

/* Minimalist Stark Buttons */
.btn-primary {
  background: #000000;
  color: #ffffff;
  border: 1px solid #000000;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: #27272a;
}

.btn-primary:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.auth-box {
  padding: 28px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-box h2 {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.auth-hint {
  color: #71717a;
  font-size: 11px;
  margin-bottom: 4px;
}

.input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  font-size: 11px;
  color: #09090b;
  outline: none;
  background: #fafafa;
}

.input:focus {
  border-color: #000000;
  background: #ffffff;
}

.w-full {
  width: 100%;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
}

.summary-bar {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e4e4e7;
  margin-bottom: 14px;
  font-size: 11px;
  font-weight: 500;
}

.resolved-count {
  color: #71717a;
  font-family: monospace;
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: #71717a;
}

.empty-icon {
  font-size: 24px;
  margin-bottom: 10px;
  filter: grayscale(100%);
}

.empty-state h3 {
  font-size: 12px;
  font-weight: 600;
  color: #09090b;
  margin-bottom: 4px;
}

.empty-state p {
  font-size: 11px;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Minimal Monochrome Issue Cards */
.issue-card {
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  padding: 12px 14px;
  transition: border-color 0.15s ease;
}

.issue-card:hover {
  border-color: #a1a1aa;
}

.issue-card.resolved {
  opacity: 0.45;
  background: #fafafa;
}

.issue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

/* High-Contrast Monochrome Badges */
.badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  font-family: monospace;
  letter-spacing: 0.05em;
}

.badge.critical {
  background: #000000;
  color: #ffffff;
}

.badge.high {
  border: 1px solid #000000;
  color: #000000;
  background: transparent;
}

.badge.medium, .badge.low, .badge.info {
  background: #f4f4f5;
  color: #71717a;
  border: 1px solid #e4e4e7;
}

.node-tag {
  font-size: 10px;
  font-family: monospace;
  color: #52525b;
  background: #f4f4f5;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #e4e4e7;
}

.node-tag:hover {
  background: #e4e4e7;
  color: #000000;
}

.rule-title {
  font-size: 12px;
  font-weight: 600;
  color: #09090b;
  margin-bottom: 4px;
}

.description {
  font-size: 11px;
  color: #52525b;
  line-height: 1.45;
  margin-bottom: 10px;
}

.fix-box {
  background: #fafafa;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 10px;
  font-size: 10px;
}

.fix-label {
  color: #71717a;
  display: block;
  font-size: 9px;
  text-transform: uppercase;
  font-mono: monospace;
  margin-bottom: 3px;
}

.fix-box code {
  color: #000000;
  font-weight: 600;
  font-family: monospace;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-top: 1px solid #f4f4f5;
  padding-top: 8px;
}

.btn-fix {
  background: #000000;
  color: #ffffff;
  border: 1px solid #000000;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-fix:hover {
  background: #27272a;
}

.advisory-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.advisory-label {
  font-size: 10px;
  color: #71717a;
  font-family: monospace;
}

.btn-secondary {
  background: #ffffff;
  color: #000000;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #f4f4f5;
  border-color: #000000;
}

.resolved-badge {
  color: #71717a;
  font-size: 10px;
  font-weight: 600;
  font-family: monospace;
}
</style>