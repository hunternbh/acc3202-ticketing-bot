<template>
  <main class="account-page">
    <SiteHeader :show-title="false" :show-search="false" />

    <section class="account-wrap">
      <div class="account-panel">
        <div class="panel-header">My Account</div>

        <div v-if="loading" class="status-box">
          Loading account details...
        </div>

        <div v-else-if="errorMessage" class="status-box error">
          {{ errorMessage }}
          <br />
          <button @click="router.push('/')">Back to Home</button>
        </div>

        <div v-else-if="account" class="account-content">
          <section class="wallet-summary">
            <div>
              <div class="label">Logged in as</div>
              <div class="email">{{ account.user.email }}</div>
            </div>

            <div>
              <div class="label">Wallet Balance</div>
              <div class="wallet">
                ${{ account.user.walletBalance.toFixed(2) }}
              </div>
            </div>

            <div>
              <div class="label">Tickets Bought</div>
              <div class="wallet">
                {{ totalTickets }}
              </div>
            </div>
          </section>

          <section class="holdings-section">
            <h1>Tickets Purchased</h1>

            <div v-if="account.holdings.length === 0" class="empty">
              You have not purchased any tickets yet.
            </div>

            <div v-else class="holdings-table">
              <div class="table-header">
                <div>Event</div>
                <div>Ticket Type</div>
                <div>Qty</div>
                <div>Paid</div>
                <div>Purchase Time</div>
              </div>

              <div
                v-for="item in account.holdings"
                :key="`${item.purchaseId}-${item.ticketType}`"
                class="table-row"
              >
                <div>
                  <strong>{{ item.eventTitle }}</strong>
                  <br />
                  <span>{{ item.eventVenue }}</span>
                  <br />
                  <span>{{ item.eventDate }}</span>
                </div>

                <div>{{ item.ticketType }}</div>

                <div>{{ item.quantity }}</div>

                <div>${{ item.subtotal.toFixed(2) }}</div>

                <div>{{ formatTime(item.createdAt) }}</div>
              </div>
            </div>
          </section>

          <section class="audit-note">
            <h2>Audit Trail Note</h2>
            <p>
              These holdings are pulled from the server-side purchase records.
              Students cannot reset this information from the browser.
            </p>
          </section>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'

const router = useRouter()

const loading = ref(true)
const errorMessage = ref('')
const account = ref(null)

const totalTickets = computed(() => {
  if (!account.value) return 0
  return account.value.holdings.reduce((sum, item) => sum + item.quantity, 0)
})

onMounted(async () => {
  const token = localStorage.getItem('ticketToken')

  if (!token) {
    loading.value = false
    errorMessage.value = 'You must sign in to view your account.'
    return
  }

  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL

    const response = await fetch(`${API_BASE}/api/my-holdings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value = data.error || 'Could not load account details.'
      loading.value = false
      return
    }

    account.value = data

    const storedUser = localStorage.getItem('ticketUser')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      user.walletBalance = data.user.walletBalance
      localStorage.setItem('ticketUser', JSON.stringify(user))
    }
  } catch (error) {
    errorMessage.value = 'Could not connect to the account server.'
  } finally {
    loading.value = false
  }
})

function formatTime(value) {
  return new Date(value).toLocaleString()
}
</script>

<style scoped>
.account-page {
  min-height: 100vh;
  background: #f2f2f2;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}

.account-wrap {
  max-width: 1050px;
  margin: 42px auto 70px;
  padding: 0 24px;
}

.account-panel {
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

.account-content {
  padding: 34px 42px 40px;
}

.wallet-summary {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  border: 1px solid #d8d8d8;
  margin-bottom: 36px;
}

.wallet-summary > div {
  padding: 22px;
  border-right: 1px solid #d8d8d8;
}

.wallet-summary > div:last-child {
  border-right: none;
}

.label {
  font-size: 13px;
  font-weight: 900;
  color: #555;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.email {
  font-size: 20px;
  font-weight: 900;
}

.wallet {
  font-size: 30px;
  font-weight: 900;
}

.holdings-section h1 {
  margin: 0 0 22px;
  font-size: 30px;
}

.empty {
  background: #f6f8fb;
  border-left: 5px solid #0057ff;
  padding: 18px 20px;
  color: #333;
}

.holdings-table {
  border-top: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 0.5fr 0.7fr 1.2fr;
  gap: 18px;
  align-items: center;
  padding: 16px 18px;
}

.table-header {
  background: #f5f5f5;
  font-weight: 900;
}

.table-row:nth-child(odd) {
  background: #ededed;
}

.table-row span {
  color: #555;
  font-size: 14px;
}

.audit-note {
  margin-top: 28px;
  padding: 18px 20px;
  background: #f6f8fb;
  border-left: 5px solid #0057ff;
}

.audit-note h2 {
  margin: 0 0 8px;
  font-size: 19px;
}

.audit-note p {
  margin: 0;
  line-height: 1.45;
  color: #333;
}

.status-box {
  padding: 44px;
  font-size: 18px;
}

.status-box.error {
  color: #b00020;
  font-weight: 800;
}

.status-box button {
  margin-top: 20px;
  border: none;
  background: #0057ff;
  color: white;
  padding: 13px 22px;
  border-radius: 24px;
  font-weight: 900;
  cursor: pointer;
}

@media (max-width: 850px) {
  .wallet-summary,
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
  }

  .wallet-summary > div {
    border-right: none;
    border-bottom: 1px solid #d8d8d8;
  }

  .wallet-summary > div:last-child {
    border-bottom: none;
  }

  .table-header {
    display: none;
  }
}
</style>