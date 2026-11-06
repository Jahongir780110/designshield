<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { apiRequest } from "../api/client";

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
  createdAt: string;
}

interface ScanDetail {
  id: string;
  figmaFileKey: string;
  figmaFileName: string;
  createdAt: string;
  issues: Issue[];
}

const route = useRoute();
const scan = ref<ScanDetail | null>(null);
const isLoading = ref(true);

const fetchScanDetail = async () => {
  try {
    const res = await apiRequest(`/scans/${route.params.id}`);
    scan.value = res.data.scan;
  } catch (err) {
    console.error("Failed to load scan report:", err);
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

onMounted(fetchScanDetail);
</script>

<template>
  <div class="space-y-6">
    <!-- Breadcrumb & Back -->
    <div>
      <router-link
        to="/"
        class="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors mb-4"
      >
        <span>&larr;</span> Back to All Audits
      </router-link>

      <!-- Scan Header Card -->
      <div v-if="scan" class="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">🎨</span>
            <h1 class="text-xl font-bold text-slate-100">{{ scan.figmaFileName }}</h1>
          </div>
          <p class="text-xs text-slate-400 mt-1 font-mono">
            File Key: <span class="text-slate-300">{{ scan.figmaFileKey }}</span> • Audited on {{ formatDate(scan.createdAt) }}
          </p>
        </div>

        <div class="flex gap-3">
          <div class="px-3.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <div class="text-lg font-bold text-red-400">
              {{ scan.issues.filter(i => i.severity === 'CRITICAL').length }}
            </div>
            <div class="text-[10px] text-red-300 uppercase font-mono">Critical</div>
          </div>
          <div class="px-3.5 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
            <div class="text-lg font-bold text-orange-400">
              {{ scan.issues.filter(i => i.severity === 'HIGH').length }}
            </div>
            <div class="text-[10px] text-orange-300 uppercase font-mono">High</div>
          </div>
          <div class="px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div class="text-lg font-bold text-emerald-400">
              {{ scan.issues.filter(i => i.status === 'RESOLVED').length }}
            </div>
            <div class="text-[10px] text-emerald-300 uppercase font-mono">Resolved</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="p-12 text-center text-slate-500 text-xs">
      Loading security audit findings...
    </div>

    <!-- Findings Grid -->
    <div v-else-if="scan" class="space-y-4">
      <h2 class="text-sm font-semibold text-slate-300">
        Discovered Security & Privacy Vulnerabilities ({{ scan.issues.length }})
      </h2>

      <div class="space-y-3">
        <div
          v-for="issue in scan.issues"
          :key="issue.id"
          class="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
        >
          <div class="flex justify-between items-start gap-4 mb-3">
            <div class="flex items-center gap-2">
              <!-- Severity Badge -->
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono"
                :class="{
                  'bg-red-500/10 text-red-400 border border-red-500/20': issue.severity === 'CRITICAL',
                  'bg-orange-500/10 text-orange-400 border border-orange-500/20': issue.severity === 'HIGH',
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20': issue.severity === 'MEDIUM',
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20': issue.severity === 'LOW' || issue.severity === 'INFO',
                }"
              >
                {{ issue.severity }}
              </span>

              <!-- Rule Name -->
              <h3 class="text-sm font-semibold text-slate-200">{{ issue.ruleName }}</h3>
            </div>

            <!-- Figma Canvas Node Badge -->
            <span class="font-mono text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              🎯 Node: {{ issue.nodeName }} <span class="text-slate-500">({{ issue.nodeId }})</span>
            </span>
          </div>

          <!-- Description -->
          <p class="text-xs text-slate-400 leading-relaxed mb-4">
            {{ issue.description }}
          </p>

          <!-- Suggested Fix Box -->
          <div v-if="issue.suggestedFix" class="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
            <span class="text-[10px] uppercase font-mono text-slate-500 block mb-1">Recommended Remediation:</span>
            <code class="text-xs text-emerald-400 font-mono break-all">{{ issue.suggestedFix }}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>