<template>
  <main class="result-page">
    <SiteHeader :show-title="false" :show-search="false" />

    <section class="result-card">
      <div class="status-icon success">✓</div>

      <h1>Ticket Purchase Successful</h1>

      <p class="lead">
        Your ticket order has been confirmed.
      </p>

      <div v-if="result" class="summary">
        <div class="row">
          <span>Event</span>
          <strong>{{ result.eventTitle }}</strong>
        </div>

        <div class="row">
          <span>Date</span>
          <strong>{{ result.eventDate }}</strong>
        </div>

        <div class="row">
          <span>Venue</span>
          <strong>{{ result.eventVenue }}</strong>
        </div>

        <div class="row">
          <span>Total Paid</span>
          <strong>${{ result.total.toFixed(2) }}</strong>
        </div>

        <div class="row">
          <span>Remaining Wallet Balance</span>
          <strong>${{ result.balanceAfterPurchase.toFixed(2) }}</strong>
        </div>

        <div class="row">
          <span>Confirmation Time</span>
          <strong>{{ formattedTime }}</strong>
        </div>
      </div>

      <div class="audit-box">
        <h2>Audit Evidence Generated</h2>
        <p>
          The system recorded a successful purchase authorization, wallet-balance
          check, ticket selection, and confirmation timestamp.
        </p>
      </div>

      <div class="actions">
        <button @click="router.push('/concerts')">Back to Concerts</button>
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

const formattedTime = computed(() => {
  if (!result.value?.timestamp) return ''
  return new Date(result.value.timestamp).toLocaleString()
})
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
  font-size: 42px;
  font-weight: 900;
}

.success {
  background: #1b9e5a;
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
  background: #f6f8fb;
  border-left: 5px solid #1b9e5a;
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
}

button {
  border: none;
  background: #0057ff;
  color: white;
  padding: 15px 28px;
  border-radius: 26px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}
</style>