<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { apiRequest, setStoredToken } from "../api/client";

const emit = defineEmits(["login-success"]);
const router = useRouter();

// Toggle between Login and Register tabs
const isRegisterMode = ref(false);

const email = ref("");
const password = ref("");
const name = ref("");
const role = ref<"DESIGNER" | "SECURITY_LEAD">("DESIGNER");

const isLoading = ref(false);
const errorMessage = ref("");

const handleSubmit = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    if (isRegisterMode.value) {
      // 1. Register endpoint (supports role!)
      const res = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.value,
          password: password.value,
          name: name.value,
          role: role.value,
        }),
      });
      setStoredToken(res.data.token);
    } else {
      // 2. Login endpoint
      const res = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.value, password: password.value }),
      });
      setStoredToken(res.data.token);
    }

    emit("login-success");
    router.push("/");
  } catch (err: any) {
    errorMessage.value = err.message || "Authentication failed.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="max-w-md mx-auto mt-12">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
      <!-- Glow effect -->
      <div class="absolute -top-12 -left-12 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="text-center mb-6">
        <span class="text-4xl inline-block mb-2">🛡️</span>
        <h1 class="text-xl font-bold text-slate-100">DesignShield Portal</h1>
        <p class="text-xs text-slate-400 mt-1">
          {{ isRegisterMode ? "Create a new team account with RBAC" : "Sign in to inspect company design security" }}
        </p>
      </div>

      <!-- Tab Switcher -->
      <div class="flex bg-slate-950 p-1 rounded-lg border border-slate-800 mb-6 text-xs">
        <button
          type="button"
          @click="isRegisterMode = false"
          class="flex-1 py-1.5 rounded-md font-medium transition-colors"
          :class="!isRegisterMode ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
        >
          Sign In
        </button>
        <button
          type="button"
          @click="isRegisterMode = true"
          class="flex-1 py-1.5 rounded-md font-medium transition-colors"
          :class="isRegisterMode ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
        >
          Register New Account
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Full Name (Only in Register mode) -->
        <div v-if="isRegisterMode">
          <label class="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
          <input
            v-model="name"
            type="text"
            required
            placeholder="e.g. Sarah Connor"
            class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 outline-none"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="name@company.com"
            class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 outline-none"
          />
        </div>

        <!-- Password -->
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="Min 8 characters"
            class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 outline-none"
          />
        </div>

        <!-- Role Selector (Only in Register mode) -->
        <div v-if="isRegisterMode">
          <label class="block text-xs font-medium text-slate-300 mb-1.5">Organizational Role (RBAC)</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex flex-col p-3 rounded-lg border cursor-pointer text-xs transition-colors"
              :class="role === 'DESIGNER' ? 'bg-blue-500/10 border-blue-500 text-slate-100' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'"
            >
              <input type="radio" v-model="role" value="DESIGNER" class="sr-only" />
              <span class="font-bold flex items-center gap-1.5">🎨 Designer</span>
              <span class="text-[10px] text-slate-500 mt-1">Can run scans and apply fixes</span>
            </label>

            <label
              class="flex flex-col p-3 rounded-lg border cursor-pointer text-xs transition-colors"
              :class="role === 'SECURITY_LEAD' ? 'bg-purple-500/10 border-purple-500 text-slate-100' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'"
            >
              <input type="radio" v-model="role" value="SECURITY_LEAD" class="sr-only" />
              <span class="font-bold flex items-center gap-1.5 text-purple-300">🛡️ Security Lead</span>
              <span class="text-[10px] text-slate-500 mt-1">Can view audits & configure rules</span>
            </label>
          </div>
        </div>

        <div v-if="errorMessage" class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-xs transition-colors shadow-lg shadow-blue-500/20"
        >
          {{ isLoading ? "Processing..." : isRegisterMode ? "Create Account & Enter" : "Sign In" }}
        </button>
      </form>
    </div>
  </div>
</template>