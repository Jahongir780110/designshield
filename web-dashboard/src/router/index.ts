import { createRouter, createWebHistory } from "vue-router";
import { getStoredToken } from "../api/client";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/login",
            name: "Login",
            component: () => import("../views/LoginView.vue"),
            meta: { requiresAuth: false },
        },
        {
            path: "/",
            name: "Dashboard",
            component: () => import("../views/DashboardView.vue"),
            meta: { requiresAuth: true },
        },
        {
            path: "/scans/:id",
            name: "ScanDetail",
            component: () => import("../views/ScanDetailView.vue"),
            meta: { requiresAuth: true },
        },
    ],
});

// Navigation Guard: Protect private views
router.beforeEach((to, from, next) => {
    const token = getStoredToken();
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

    if (requiresAuth && !token) {
        next({ name: "Login" });
    } else if (to.name === "Login" && token) {
        next({ name: "Dashboard" });
    } else {
        next();
    }
});

export default router;