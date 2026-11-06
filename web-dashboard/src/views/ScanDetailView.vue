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
  user?: {
    name: string;
    email: string;
  };
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
        class="text-xs text-zinc-500 hover:text-black inline-flex items-center gap-1.5 transition-colors mb-4"
      >
        <span>&larr;</span> Back to All Audits
      </router-link>

      <!-- Scan Header Card -->
      <div v-if="scan" class="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 class="text-lg font-bold text-zinc-900 tracking-tight">{{ scan.figmaFileName }}</h1>
          
          <div class="flex items-center gap-3 mt-2 flex-wrap">
            <!-- Designer Badge -->
            <div v-if="scan.user" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-[11px]">
              <span class="text-zinc-500 font-mono">Audited by:</span>
              <span class="text-zinc-900 font-semibold">{{ scan.user.name }}</span>
              <span class="text-zinc-500 font-mono text-[10px]">({{ scan.user.email }})</span>
            </div>

            <span class="text-xs text-zinc-500 font-mono">
              Key: {{ scan.figmaFileKey }} • {{ formatDate(scan.createdAt) }}
            </span>
          </div>
        </div>

        <!-- Metric Tallies -->
        <div class="flex gap-2">
          <div class="px-3.5 py-2 rounded-lg bg-black text-white text-center min-w-[72px]">
            <div class="text-base font-bold font-mono">
              {{ scan.issues.filter(i => i.severity === 'CRITICAL').length }}
            </div>
            <div class="text-[9px] text-zinc-300 uppercase font-mono">Critical</div>
          </div>
          <div class="px-3.5 py-2 rounded-lg bg-zinc-100 border border-zinc-300 text-center min-w-[72px]">
            <div class="text-base font-bold font-mono text-zinc-900">
              {{ scan.issues.filter(i => i.severity === 'HIGH').length }}
            </div>
            <div class="text-[9px] text-zinc-500 uppercase font-mono">High</div>
          </div>
          <div class="px-3.5 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-center min-w-[72px]">
            <div class="text-base font-bold font-mono text-zinc-600">
              {{ scan.issues.filter(i => i.status === 'RESOLVED').length }}
            </div>
            <div class="text-[9px] text-zinc-400 uppercase font-mono">Resolved</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="p-12 text-center text-zinc-400 text-xs font-mono">
      Loading security audit findings...
    </div>

    <!-- Findings Grid -->
    <div v-else-if="scan" class="space-y-4">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-600 font-mono">
        Discovered Security & Privacy Vulnerabilities ({{ scan.issues.length }})
      </h2>

      <div class="space-y-3">
        <div
          v-for="issue in scan.issues"
          :key="issue.id"
          class="bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 shadow-sm transition-all"
        >
          <div class="flex justify-between items-start gap-4 mb-3">
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Severity Tag -->
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono"
                :class="{
                  'bg-black text-white border border-black': issue.severity === 'CRITICAL',
                  'bg-zinc-800 text-white border border-zinc-800': issue.severity === 'HIGH',
                  'bg-zinc-100 text-zinc-800 border border-zinc-300': issue.severity === 'MEDIUM',
                  'bg-zinc-50 text-zinc-600 border border-zinc-200': issue.severity === 'LOW' || issue.severity === 'INFO',
                }"
              >
                {{ issue.severity }}
              </span>

              <!-- Engine Source Tag: AI vs Regex -->
              <span
                v-if="issue.ruleId.startsWith('AI_')"
                class="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-800 border border-zinc-300"
              >
                [AI: GEMINI]
              </span>
              <span
                v-else
                class="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-50 text-zinc-600 border border-zinc-200"
              >
                [RULE: REGEX]
              </span>

              <!-- Rule Name -->
              <h3 class="text-sm font-semibold text-zinc-900">{{ issue.ruleName }}</h3>
            </div>

            <!-- Canvas Node Badge -->
            <span class="font-mono text-[11px] px-2.5 py-1 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
              Layer: {{ issue.nodeName }} <span class="text-zinc-400">({{ issue.nodeId }})</span>
            </span>
          </div>

          <!-- Description -->
          <p class="text-xs text-zinc-600 leading-relaxed mb-4">
            {{ issue.description }}
          </p>

          <!-- Suggested Fix Box -->
          <div v-if="issue.suggestedFix" class="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
            <span class="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Recommended Remediation:</span>
            <code class="text-xs text-zinc-900 font-mono break-all font-semibold">{{ issue.suggestedFix }}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>