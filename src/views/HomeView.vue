<template>
  <main class="page">
    <SiteHeader :show-title="true" :show-search="true" />

    <section class="hero">
      <img :src="`${baseUrl}main.png`" alt="Ticketing event hero image" />
      <div class="hero-overlay"></div>

      <div class="hero-text">
        <h2>SeatGate Trial</h2>
        <p>Three Guys, Two Scores, One Magical Performance.</p>
        <button @click="goTickets">Find Tickets</button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { useRouter } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
const baseUrl = import.meta.env.BASE_URL

const router = useRouter()

function goTickets() {
  router.push('/tickets')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #050505;
  color: white;
  font-family: Arial, Helvetica, sans-serif;
}

.hero {
  position: relative;
  height: calc(100vh - 295px);
  min-height: 470px;
  overflow: hidden;
}

.hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.82) 0%,
    rgba(0, 0, 0, 0.55) 35%,
    rgba(0, 0, 0, 0.35) 100%
  );
}

.hero-text {
  position: absolute;
  left: 38px;
  bottom: 62px;
  max-width: 650px;
}

.hero-text h2 {
  font-size: 42px;
  margin: 0 0 14px;
  font-weight: 800;
}

.hero-text p {
  font-size: 24px;
  line-height: 1.35;
  margin: 0 0 28px;
  font-weight: 700;
}

.hero-text button {
  background: #0057ff;
  border: none;
  color: white;
  padding: 16px 28px;
  border-radius: 5px;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
}
</style>