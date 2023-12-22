import { createRouter, createWebHistory } from "vue-router";
import LogInView from "@/views/LogInView.vue";
import SignUpView from "@/views/SignUpView.vue";
import ChannelView from "@/views/ChannelView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/c/:channelId",
      name: "channel",
      component: ChannelView,
    },
    {
      path: "/login",
      name: "login",
      component: LogInView,
    },
    {
      path: "/signup",
      name: "signup",
      component: SignUpView,
    },
  ],
});

export default router;
