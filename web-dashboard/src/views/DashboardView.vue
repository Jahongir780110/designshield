<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiRequest } from "../api/client";

interface ScanSummary {
  id: string;
  figmaFileKey: string;
  figmaFileName: string;
  createdAt: string;
  _count: {
    issues: number;
  };
}

const scans = ref<ScanSummary[]>([]);
const isLoading = ref(true);

const fetchScans = async () => {
  try {
    const res = await apiRequest("/scans");
    scans.value = res.data.scans;
  } catch (err) {
    console.error("Failed to load scans:", err);
  } finally {
    isLoading.value = false;
  }
};

// Security KPI Metrics
const totalScans = computed(() => scans.value.length);
const totalIssuesDetected = computed(() =>
  scans.value.reduce((acc, curr) => acc + curr._count.issues, 0)
);
const avgIssuesPerScan = computed(() =>
  totalScans.value > 0 ? (totalIssuesDetected.value / totalScans.value).toFixed(1) : "0"
);

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

onMounted(fetchScans);
</script>

<template>
  <div class="space-y-8">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-100">Design Security Audits</h1>
      <p class="text-xs text-slate-400 mt-1">
        Continuous security and privacy verification for your organization's Figma workflows.
      </p>
    </div>

    <!-- Security KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Total Audits -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
        <div class="flex justify-between items-start">
          <div>
            <span class="text-xs font-medium text-slate-400">Total Audits Run</span>
            <div class="text-2xl font-bold text-slate-100 mt-1">{{ totalScans }}</div>
          </div>
          <span class="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg text-lg">📊</span>
        </div>
        <span class="text-[10px] text-slate-500 block mt-3 font-mono">Live PostgreSQL metric</span>
      </div>

      <!-- Vulnerabilities Caught -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
        <div class="flex justify-between items-start">
          <div>
            <span class="text-xs font-medium text-slate-400">Vulnerabilities Caught In-Flight</span>
            <div class="text-2xl font-bold text-orange-400 mt-1">{{ totalIssuesDetected }}</div>
          </div>
          <span class="p-2.5 bg-orange-500/10 text-orange-400 rounded-lg text-lg">🛡️</span>
        </div>
        <span class="text-[10px] text-emerald-400 block mt-3 font-medium">Prevented pre-production</span>
      </div>

      <!-- Avg Issues per Mockup -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
        <div class="flex justify-between items-start">
          <div>
            <span class="text-xs font-medium text-slate-400">Avg Flaws Per Mockup</span>
            <div class="text-2xl font-bold text-indigo-400 mt-1">{{ avgIssuesPerScan }}</div>
          </div>
          <span class="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-lg">⚡</span>
        </div>
        <span class="text-[10px] text-slate-500 block mt-3 font-mono">Benchmark target: &lt; 1.0</span>
      </div>
    </div>

    <!-- Audits History Table -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
        <h2 class="text-sm font-semibold text-slate-200">Recent Figma Canvas Audits</h2>
        <button @click="fetchScans" class="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          🔄 Refresh
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="scans.length === 0 && !isLoading" class="p-12 text-center text-slate-500 text-xs">
        No design audits found. Run an audit from the Figma plugin to see live reports here.
      </div>

      <!-- Table -->
      <table v-else class="w-full text-left text-xs">
        <thead class="bg-slate-950/50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
          <tr>
            <th class="py-3 px-6">Figma Document</th>
            <th class="py-3 px-6">File Identifier</th>
            <th class="py-3 px-6">Scan Date</th>
            <th class="py-3 px-6">Findings</th>
            <th class="py-3 px-6 text-right">Report</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800">
          <tr v-for="scan in scans" :key="scan.id" class="hover:bg-slate-800/40 transition-colors">
            <td class="py-4 px-6 font-medium text-slate-200">
              <span class="inline-block mr-2">🎨</span>{{ scan.figmaFileName }}
            </td>
            <td class="py-4 px-6 font-mono text-slate-400 text-[11px]">
              {{ scan.figmaFileKey }}
            </td>
            <td class="py-4 px-6 text-slate-400">
              {{ formatDate(scan.createdAt) }}
            </td>
            <td class="py-4 px-6">
              <span
                class="px-2.5 py-1 rounded-full font-semibold font-mono text-[11px]"
                :class="scan._count.issues > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'"
              >
                {{ scan._count.issues }} {{ scan._count.issues === 1 ? 'flaw' : 'flaws' }}
              </span>
            </td>
            <td class="py-4 px-6 text-right">
              <router-link
                :to="`/scans/${scan.id}`"
                class="text-xs text-blue-400 hover:text-blue-300 font-medium hover:underline inline-flex items-center gap-1"
              >
                Inspect Report &rarr;
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>