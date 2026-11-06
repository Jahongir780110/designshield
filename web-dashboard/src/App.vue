<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getStoredToken, clearStoredToken, apiRequest } from "./api/client";

const router = useRouter();
const user = ref<any>(null);

const fetchUser = async () => {
  if (!getStoredToken()) return;
  try {
    const res = await apiRequest("/auth/me");
    user.value = res.data.user;
  } catch {
    clearStoredToken();
    user.value = null;
    router.push("/login");
  }
};

const handleLogout = () => {
  clearStoredToken();
  user.value = null;
  router.push("/login");
};

onMounted(fetchUser);
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <!-- Navbar -->
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-3 group">
          <span class="text-2xl p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg group-hover:scale-105 transition-transform">
            🛡️
          </span>
          <div>
            <span class="text-base font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              DesignShield
            </span>
            <span class="text-xs text-slate-400 block -mt-1 font-mono">Enterprise Security Portal</span>
          </div>
        </router-link>

        <!-- User Profile & Logout -->
        <div v-if="user" class="flex items-center gap-4">
          <div class="text-right">
            <span class="text-xs font-semibold text-slate-200 block">{{ user.name }}</span>
            <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {{ user.role }}
            </span>
          </div>
          <button
            @click="handleLogout"
            class="text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-red-500/30 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>

    <!-- Page Content -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
      <router-view @login-success="fetchUser" />
    </main>
  </div>
</template>