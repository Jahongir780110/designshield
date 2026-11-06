<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { apiRequest, setStoredToken } from "../api/client";

const emit = defineEmits(["login-success"]);
const router = useRouter();

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
    <div class="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm">
      <div class="text-center mb-6">
        <div class="w-10 h-10 mx-auto rounded-lg bg-black text-white flex items-center justify-center text-xs font-mono font-bold mb-3">
          DS
        </div>
        <h1 class="text-lg font-bold text-zinc-900 tracking-tight">DesignShield Portal</h1>
        <p class="text-xs text-zinc-500 mt-1">
          {{ isRegisterMode ? "Create an account with role-based access" : "Sign in to inspect company design security" }}
        </p>
      </div>

      <!-- Tab Switcher -->
      <div class="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 mb-6 text-xs font-medium">
        <button
          type="button"
          @click="isRegisterMode = false"
          class="flex-1 py-1.5 rounded-md transition-all"
          :class="!isRegisterMode ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'"
        >
          Sign In
        </button>
        <button
          type="button"
          @click="isRegisterMode = true"
          class="flex-1 py-1.5 rounded-md transition-all"
          :class="isRegisterMode ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'"
        >
          Register
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Full Name -->
        <div v-if="isRegisterMode">
          <label class="block text-xs font-medium text-zinc-700 mb-1.5">Full Name</label>
          <input
            v-model="name"
            type="text"
            required
            placeholder="e.g. Sarah Connor"
            class="w-full bg-zinc-50 border border-zinc-200 focus:border-black focus:bg-white rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none transition-colors"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block text-xs font-medium text-zinc-700 mb-1.5">Email Address</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="name@company.com"
            class="w-full bg-zinc-50 border border-zinc-200 focus:border-black focus:bg-white rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none transition-colors"
          />
        </div>

        <!-- Password -->
        <div>
          <label class="block text-xs font-medium text-zinc-700 mb-1.5">Password</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="Min 8 characters"
            class="w-full bg-zinc-50 border border-zinc-200 focus:border-black focus:bg-white rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none transition-colors"
          />
        </div>

        <!-- Role Selector -->
        <div v-if="isRegisterMode">
          <label class="block text-xs font-medium text-zinc-700 mb-1.5">Organizational Role (RBAC)</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex flex-col p-3 rounded-lg border cursor-pointer text-xs transition-colors"
              :class="role === 'DESIGNER' ? 'bg-zinc-50 border-black text-zinc-900 ring-1 ring-black' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'"
            >
              <input type="radio" v-model="role" value="DESIGNER" class="sr-only" />
              <span class="font-bold text-zinc-900">Designer</span>
              <span class="text-[10px] text-zinc-500 mt-1">Runs scans & applies canvas fixes</span>
            </label>

            <label
              class="flex flex-col p-3 rounded-lg border cursor-pointer text-xs transition-colors"
              :class="role === 'SECURITY_LEAD' ? 'bg-zinc-50 border-black text-zinc-900 ring-1 ring-black' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'"
            >
              <input type="radio" v-model="role" value="SECURITY_LEAD" class="sr-only" />
              <span class="font-bold text-zinc-900">Security Lead</span>
              <span class="text-[10px] text-zinc-500 mt-1">Inspects team audits & governance</span>
            </label>
          </div>
        </div>

        <div v-if="errorMessage" class="p-3 bg-zinc-100 border border-zinc-300 rounded-lg text-xs text-zinc-800 font-mono">
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-black hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm"
        >
          {{ isLoading ? "Processing..." : isRegisterMode ? "Create Account" : "Sign In" }}
        </button>
      </form>
    </div>
  </div>
</template>