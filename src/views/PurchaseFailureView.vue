<template>
  <main class="result-page">
    <SiteHeader :show-title="false" :show-search="false" />

    <section class="result-card">
      <div class="status-icon failure">×</div>

      <h1>Ticket Purchase Failed</h1>

      <p class="lead">
        The purchase could not be completed.
      </p>

      <div v-if="result" class="summary">
        <div class="row">
          <span>Event</span>
          <strong>{{ result.eventTitle }}</strong>
        </div>

        <div class="row">
          <span>Order Total</span>
          <strong>${{ result.total.toFixed(2) }}</strong>
        </div>

        <div class="row">
          <span>Wallet Balance</span>
          <strong>${{ result.walletBalance.toFixed(2) }}</strong>
        </div>

        <div class="row">
          <span>Shortfall</span>
          <strong>${{ shortfall.toFixed(2) }}</strong>
        </div>
      </div>

      <div class="audit-box">
        <h2>Failure Reason</h2>
        <p>
          The wallet balance was insufficient for the selected ticket quantity.
          In the full sandbox version, this failure would be logged as a rejected
          purchase attempt with a control reason code.
        </p>
      </div>

      <div class="actions">
        <button class="back-button" @click="goBack">Back to Event</button>
        <button class="concerts-button" @click="router.push('/concerts')">
          Back to Concerts
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'

const router = useRouter()

const storedResult = localStorage.getItem('ticketPurchaseResult')
const result = ref(storedResult ? JSON.parse(storedResult) : null)

const shortfall = computed(() => {
  if (!result.value) return 0
  return Math.max(0, result.value.total - result.value.walletBalance)
})

function goBack() {
  const cart = localStorage.getItem('ticketCart')
  if (cart) {
    const parsedCart = JSON.parse(cart)
    router.push(`/events/${parsedCart.eventId}`)
  } else {
    router.push('/concerts')
  }
}
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  background: #f2f2f2;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}

.result-card {
  max-width: 760px;
  margin: 54px auto;
  padding: 44px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16);
  text-align: center;
}

.status-icon {
  width: 76px;
  height: 76px;
  border-radius: 999px;
  margin: 0 auto 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 900;
}

.failure {
  background: #b00020;
  color: white;
}

h1 {
  margin: 0 0 10px;
  font-size: 34px;
}

.lead {
  margin: 0 0 30px;
  color: #444;
  font-size: 18px;
}

.summary {
  border-top: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
  margin: 26px 0;
  text-align: left;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px solid #eee;
}

.row:last-child {
  border-bottom: none;
}

.row span {
  color: #555;
}

.audit-box {
  text-align: left;
  background: #fff6f6;
  border-left: 5px solid #b00020;
  padding: 18px 20px;
  margin-top: 28px;
}

.audit-box h2 {
  margin: 0 0 8px;
  font-size: 19px;
}

.audit-box p {
  margin: 0;
  line-height: 1.45;
}

.actions {
  margin-top: 32px;
  display: flex;
  justify-content: center;
  gap: 14px;
}

button {
  border: none;
  padding: 15px 28px;
  border-radius: 26px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}

.back-button {
  background: #e3e3e3;
  color: #111;
}

.concerts-button {
  background: #0057ff;
  color: white;
}
</style>