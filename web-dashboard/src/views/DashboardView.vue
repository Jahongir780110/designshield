<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiRequest } from "../api/client";

interface ScanSummary {
  id: string;
  figmaFileKey: string;
  figmaFileName: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
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
    <div class="flex justify-between items-end border-b border-zinc-200 pb-5">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-zinc-900">Design Security Audits</h1>
        <p class="text-xs text-zinc-500 mt-1">
          Continuous security and privacy verification for your organization's Figma workflows.
        </p>
      </div>
      <button
        @click="fetchScans"
        class="text-xs text-zinc-700 hover:text-black px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors shadow-sm"
      >
        Refresh
      </button>
    </div>

    <!-- Minimal KPI Metric Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Total Audits -->
      <div class="bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 shadow-sm transition-all">
        <span class="text-xs font-medium text-zinc-500 block">Total Audits Run</span>
        <div class="text-3xl font-bold font-mono text-zinc-900 mt-2">{{ totalScans }}</div>
        <span class="text-[10px] text-zinc-400 block mt-3 font-mono">Live PostgreSQL metric</span>
      </div>

      <!-- Vulnerabilities Caught -->
      <div class="bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 shadow-sm transition-all">
        <span class="text-xs font-medium text-zinc-500 block">Vulnerabilities Caught In-Flight</span>
        <div class="text-3xl font-bold font-mono text-zinc-900 mt-2">{{ totalIssuesDetected }}</div>
        <span class="text-[10px] text-zinc-500 block mt-3 font-mono">Prevented pre-production</span>
      </div>

      <!-- Avg Issues per Mockup -->
      <div class="bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 shadow-sm transition-all">
        <span class="text-xs font-medium text-zinc-500 block">Avg Flaws Per Mockup</span>
        <div class="text-3xl font-bold font-mono text-zinc-900 mt-2">{{ avgIssuesPerScan }}</div>
        <span class="text-[10px] text-zinc-400 block mt-3 font-mono">Benchmark target: &lt; 1.0</span>
      </div>
    </div>

    <!-- Audits History Table -->
    <div class="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
      <div class="px-6 py-4 border-b border-zinc-200 bg-zinc-50/70">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-600 font-mono">Recent Canvas Audits</h2>
      </div>

      <!-- Empty State -->
      <div v-if="scans.length === 0 && !isLoading" class="p-12 text-center text-zinc-400 text-xs">
        No design audits found. Run an audit from the Figma plugin to see live reports here.
      </div>

      <!-- Table -->
      <table v-else class="w-full text-left text-xs">
        <thead class="bg-zinc-50 text-zinc-500 uppercase font-mono text-[10px] border-b border-zinc-200">
          <tr>
            <th class="py-3 px-6">Figma Document</th>
            <th class="py-3 px-6">Audited By (Designer)</th>
            <th class="py-3 px-6">Scan Date</th>
            <th class="py-3 px-6">Findings</th>
            <th class="py-3 px-6 text-right">Report</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-200">
          <tr v-for="scan in scans" :key="scan.id" class="hover:bg-zinc-50/80 transition-colors">
            <!-- 1. Document Name -->
            <td class="py-4 px-6 font-semibold text-zinc-900">
              {{ scan.figmaFileName }}
            </td>

            <!-- 2. Designer Info (Author) -->
            <td class="py-4 px-6">
              <div v-if="scan.user" class="flex flex-col">
                <span class="font-medium text-zinc-800 text-xs">{{ scan.user.name }}</span>
                <span class="text-[10px] text-zinc-400 font-mono">{{ scan.user.email }}</span>
              </div>
              <span v-else class="text-zinc-400 text-xs italic">Unknown</span>
            </td>

            <!-- 3. Date -->
            <td class="py-4 px-6 text-zinc-500 font-mono text-[11px]">
              {{ formatDate(scan.createdAt) }}
            </td>

            <!-- 4. Findings Badge -->
            <td class="py-4 px-6">
              <span
                class="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium"
                :class="scan._count.issues > 0 ? 'bg-zinc-100 text-zinc-900 border border-zinc-300' : 'bg-zinc-50 text-zinc-400 border border-zinc-200'"
              >
                {{ scan._count.issues }} {{ scan._count.issues === 1 ? 'flaw' : 'flaws' }}
              </span>
            </td>

            <!-- 5. Inspect Link -->
            <td class="py-4 px-6 text-right">
              <router-link
                :to="`/scans/${scan.id}`"
                class="text-xs text-zinc-900 hover:text-black font-semibold hover:underline inline-flex items-center gap-1"
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