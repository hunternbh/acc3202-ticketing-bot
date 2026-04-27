<template>
  <main class="admin-page">
    <SiteHeader :show-title="false" :show-search="false" />

    <section class="admin-wrap">
      <div class="admin-panel">
        <div class="panel-header">Admin: Student Ticket Holdings</div>

        <div v-if="loading" class="status-box">
          Loading holdings...
        </div>

        <div v-else-if="errorMessage" class="status-box error">
          {{ errorMessage }}
        </div>

        <div v-else class="admin-content">
          <div class="summary-row">
            <div>
              <div class="label">Students</div>
              <div class="summary-number">{{ uniqueStudentCount }}</div>
            </div>

            <div>
              <div class="label">Tickets Sold</div>
              <div class="summary-number">{{ totalTickets }}</div>
            </div>

            <div>
              <div class="label">Total Spent</div>
              <div class="summary-number">${{ totalSpent.toFixed(2) }}</div>
            </div>
          </div>

          <div class="holdings-table">
            <div class="table-header">
              <div>Email</div>
              <div>Wallet</div>
              <div>Event</div>
              <div>Ticket Type</div>
              <div>Qty</div>
              <div>Spent</div>
            </div>

            <div
              v-for="(row, index) in holdings"
              :key="index"
              class="table-row"
            >
              <div>{{ row.email }}</div>
              <div>${{ Number(row.wallet_balance).toFixed(2) }}</div>
              <div>{{ row.event_title || '—' }}</div>
              <div>{{ row.ticket_type || '—' }}</div>
              <div>{{ Number(row.quantity_owned || 0) }}</div>
              <div>${{ Number(row.amount_spent || 0).toFixed(2) }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'

const loading = ref(true)
const errorMessage = ref('')
const holdings = ref([])

const uniqueStudentCount = computed(() => {
  return new Set(holdings.value.map((row) => row.email)).size
})

const totalTickets = computed(() => {
  return holdings.value.reduce((sum, row) => {
    return sum + Number(row.quantity_owned || 0)
  }, 0)
})

const totalSpent = computed(() => {
  return holdings.value.reduce((sum, row) => {
    return sum + Number(row.amount_spent || 0)
  }, 0)
})

onMounted(async () => {
  const token = localStorage.getItem('ticketToken')

  if (!token) {
    loading.value = false
    errorMessage.value = 'You must sign in as admin to view this page.'
    return
  }

  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL

    const response = await fetch(`${API_BASE}/api/admin/holdings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value = data.error || 'Could not load admin holdings.'
      loading.value = false
      return
    }

    holdings.value = data
  } catch (error) {
    errorMessage.value = 'Could not connect to the admin server.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f2f2f2;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}

.admin-wrap {
  max-width: 1180px;
  margin: 42px auto 70px;
  padding: 0 24px;
}

.admin-panel {
  background: white;
  border-radius: 4px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

.panel-header {
  background: #e9e9e9;
  padding: 14px 24px;
  font-size: 20px;
  border-bottom: 1px solid #d4d4d4;
}

.admin-content {
  padding: 34px 42px 40px;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid #d8d8d8;
  margin-bottom: 34px;
}

.summary-row > div {
  padding: 22px;
  border-right: 1px solid #d8d8d8;
}

.summary-row > div:last-child {
  border-right: none;
}

.label {
  font-size: 13px;
  font-weight: 900;
  color: #555;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.summary-number {
  font-size: 30px;
  font-weight: 900;
}

.holdings-table {
  border-top: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 2fr 0.8fr 1.5fr 1.3fr 0.5fr 0.8fr;
  gap: 14px;
  align-items: center;
  padding: 15px 18px;
}

.table-header {
  background: #f5f5f5;
  font-weight: 900;
}

.table-row:nth-child(odd) {
  background: #ededed;
}

.status-box {
  padding: 44px;
  font-size: 18px;
}

.status-box.error {
  color: #b00020;
  font-weight: 800;
}

@media (max-width: 900px) {
  .summary-row,
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
  }

  .table-header {
    display: none;
  }
}
</style>