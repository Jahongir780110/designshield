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
  background: #f9fafb;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shield-icon {
  font-size: 20px;
}

.title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.subtitle {
  font-size: 10px;
  color: #6b7280;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-box {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-hint {
  color: #6b7280;
  font-size: 11px;
}

.input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
}

.w-full {
  width: 100%;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.summary-bar {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  margin-bottom: 12px;
  font-size: 11px;
}

.resolved-count {
  color: #059669;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 40px 16px;
  color: #6b7280;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.issue-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;
}

.issue-card.critical {
  border-left: 4px solid #ef4444;
}

.issue-card.high {
  border-left: 4px solid #f97316;
}

.issue-card.medium {
  border-left: 4px solid #f59e0b;
}

.issue-card.resolved {
  opacity: 0.6;
  border-left-color: #10b981;
}

.issue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.badge.critical {
  background: #fee2e2;
  color: #b91c1c;
}

.badge.high {
  background: #ffedd5;
  color: #c2410c;
}

.badge.medium {
  background: #fef3c7;
  color: #b45309;
}

.node-tag {
  font-size: 10px;
  color: #4b5563;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.node-tag:hover {
  background: #e5e7eb;
}

.rule-title {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.description {
  font-size: 11px;
  color: #4b5563;
  line-height: 1.4;
  margin-bottom: 8px;
}

.fix-box {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 4px;
  padding: 6px 8px;
  margin-bottom: 8px;
  font-size: 10px;
}

.fix-box code {
  color: #059669;
  font-weight: 700;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
}

.btn-fix {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn-fix:hover {
  background: #059669;
}

.resolved-badge {
  color: #10b981;
  font-size: 11px;
  font-weight: 600;
}

.advisory-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.advisory-label {
  font-size: 10px;
  color: #6b7280;
  font-style: italic;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #e5e7eb;
}
</style>