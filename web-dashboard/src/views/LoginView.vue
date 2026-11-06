<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { apiRequest, setStoredToken } from "../api/client";

const emit = defineEmits(["login-success"]);
const router = useRouter();

const email = ref("designer@acme.com");
const password = ref("SuperSecretPassword123");
const isLoading = ref(false);
const errorMessage = ref("");

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    setStoredToken(res.data.token);
    emit("login-success");
    router.push("/");
  } catch (err: any) {
    errorMessage.value = err.message || "Failed to sign in. Please verify your credentials.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="max-w-md mx-auto mt-16">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
      <!-- Glow effect -->
      <div class="absolute -top-12 -left-12 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="text-center mb-8">
        <span class="text-4xl inline-block mb-3">🛡️</span>
        <h1 class="text-xl font-bold text-slate-100">Welcome to DesignShield</h1>
        <p class="text-xs text-slate-400 mt-1">Sign in to view company-wide design security reports</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 outline-none transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 outline-none transition-colors"
          />
        </div>

        <div v-if="errorMessage" class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-xs transition-colors shadow-lg shadow-blue-500/20"
        >
          {{ isLoading ? "Verifying..." : "Sign In to Dashboard" }}
        </button>
      </form>
    </div>
  </div>
</template>