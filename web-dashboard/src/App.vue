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
  <div class="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans">
    <!-- Navbar -->
    <header class="border-b border-zinc-200 bg-white/90 backdrop-blur sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-3 group">
          <div class="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-mono text-xs font-bold transition-transform group-hover:scale-105">
            DS
          </div>
          <div>
            <span class="text-sm font-bold tracking-tight text-zinc-900 block">
              DesignShield
            </span>
            <span class="text-[10px] text-zinc-500 font-mono block -mt-0.5">Enterprise Security Portal</span>
          </div>
        </router-link>

        <!-- User Profile & Logout -->
        <div v-if="user" class="flex items-center gap-4">
          <div class="text-right">
            <span class="text-xs font-semibold text-zinc-900 block">{{ user.name }}</span>
            <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
              {{ user.role }}
            </span>
          </div>
          <button
            @click="handleLogout"
            class="text-xs text-zinc-600 hover:text-black px-3 py-1.5 rounded-md border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 transition-colors"
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