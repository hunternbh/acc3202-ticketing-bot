<template>
  <main class="admin-page">
    <SiteHeader :show-title="false" :show-search="false" />

    <section class="admin-wrap">
      <header class="admin-heading">
        <div>
          <h1>Admin Panel</h1>
          <p v-if="currentUser">Signed in as {{ currentUser.email }}</p>
        </div>

        <button class="refresh-button" :disabled="loading" @click="loadDashboard">
          Refresh
        </button>
      </header>

      <div v-if="loading" class="status-box">
        Loading admin data...
      </div>

      <div v-else-if="errorMessage" class="status-box error">
        {{ errorMessage }}
      </div>

      <div v-else class="admin-content">
        <section class="summary-row" aria-label="Admin summary">
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

          <div>
            <div class="label">Available</div>
            <div class="summary-number">{{ availableTickets }}</div>
          </div>
        </section>

        <section class="admin-section">
          <div class="section-heading">
            <h2>Reseed Database</h2>
            <span>Seed secret required</span>
          </div>

          <form class="reseed-form" @submit.prevent="reseedDatabase">
            <label>
              Seed Secret
              <input
                v-model="seedSecret"
                type="password"
                autocomplete="off"
                placeholder="Enter seed secret"
              />
            </label>

            <button
              type="submit"
              class="danger-button"
              :disabled="seedLoading || !seedSecret.trim()"
            >
              {{ seedLoading ? 'Reseeding...' : 'Reseed' }}
            </button>
          </form>

          <p v-if="seedMessage" class="release-message">
            {{ seedMessage }}
          </p>
        </section>

        <section class="admin-section">
          <div class="section-heading">
            <h2>Release Tickets</h2>
            <span v-if="selectedTicket">Ticket Type ID {{ selectedTicket.ticketTypeId }}</span>
          </div>

          <form class="release-form" @submit.prevent="releaseTickets">
            <label>
              Ticket Type
              <select v-model="selectedTicketTypeId">
                <option
                  v-for="ticket in ticketTypes"
                  :key="ticket.ticketTypeId"
                  :value="String(ticket.ticketTypeId)"
                >
                  #{{ ticket.ticketTypeId }} - {{ ticket.eventTitle }} - {{ ticket.ticketType }}
                </option>
              </select>
            </label>

            <label>
              Additional Quantity
              <input
                v-model.number="additionalQuantity"
                type="number"
                min="1"
                step="1"
              />
            </label>

            <button type="submit" :disabled="releaseLoading || !selectedTicket">
              {{ releaseLoading ? 'Releasing...' : 'Release' }}
            </button>
          </form>

          <p v-if="releaseMessage" class="release-message">
            {{ releaseMessage }}
          </p>
        </section>

        <section class="admin-section">
          <div class="section-heading">
            <h2>Ticket Inventory</h2>
          </div>

          <div class="table-wrap">
            <div class="inventory-table table">
              <div class="table-header">
                <div>ID</div>
                <div>Event</div>
                <div>Ticket</div>
                <div>Price</div>
                <div>Released</div>
                <div>Sold</div>
                <div>Available</div>
              </div>

              <div
                v-for="ticket in ticketTypes"
                :key="ticket.ticketTypeId"
                class="table-row"
              >
                <div>#{{ ticket.ticketTypeId }}</div>
                <div>{{ ticket.eventTitle }}</div>
                <div>{{ ticket.ticketType }}</div>
                <div>${{ Number(ticket.price).toFixed(2) }}</div>
                <div>{{ Number(ticket.releasedQuantity) }}</div>
                <div>{{ Number(ticket.soldQuantity) }}</div>
                <div>{{ Number(ticket.availableQuantity) }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="admin-section">
          <div class="section-heading">
            <h2>Student Ticket Holdings</h2>
          </div>

          <div class="table-wrap">
            <div class="holdings-table table">
              <div class="table-header">
                <div>Email</div>
                <div>Wallet</div>
                <div>Event</div>
                <div>Ticket Type</div>
                <div>Qty</div>
                <div>Spent</div>
                <div>Last Purchase</div>
              </div>

              <div
                v-for="(row, index) in holdings"
                :key="`${row.email}-${row.event_title || 'none'}-${row.ticket_type || 'none'}-${index}`"
                class="table-row"
              >
                <div>{{ row.email }}</div>
                <div>${{ Number(row.wallet_balance).toFixed(2) }}</div>
                <div>{{ row.event_title || '-' }}</div>
                <div>{{ row.ticket_type || '-' }}</div>
                <div>{{ Number(row.quantity_owned || 0) }}</div>
                <div>${{ Number(row.amount_spent || 0).toFixed(2) }}</div>
                <div>{{ row.last_purchase_at ? formatTime(row.last_purchase_at) : '-' }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="admin-section">
          <div class="section-heading">
            <h2>Recent Audit Logs</h2>
          </div>

          <div class="table-wrap">
            <div class="audit-table table">
              <div class="table-header">
                <div>Time</div>
                <div>User</div>
                <div>Action</div>
                <div>Event</div>
                <div>Ticket Type</div>
                <div>Status</div>
              </div>

              <div
                v-for="log in auditLogs"
                :key="log.id"
                class="table-row"
              >
                <div>{{ formatTime(log.created_at) }}</div>
                <div>{{ log.email || '-' }}</div>
                <div>{{ log.action }}</div>
                <div>{{ log.event_id || '-' }}</div>
                <div>{{ log.ticket_type_id || '-' }}</div>
                <div :class="{ success: log.success, failure: !log.success }">
                  {{ log.success ? 'Success' : 'Failed' }}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://acc3202-ticketing-bot.onrender.com'

const loading = ref(true)
const releaseLoading = ref(false)
const seedLoading = ref(false)
const errorMessage = ref('')
const releaseMessage = ref('')
const seedMessage = ref('')
const holdings = ref([])
const ticketTypes = ref([])
const auditLogs = ref([])
const currentUser = ref(null)
const selectedTicketTypeId = ref('')
const additionalQuantity = ref(10)
const seedSecret = ref('')

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

const availableTickets = computed(() => {
  return ticketTypes.value.reduce((sum, ticket) => {
    return sum + Number(ticket.availableQuantity || 0)
  }, 0)
})

const selectedTicket = computed(() => {
  return ticketTypes.value.find((ticket) => {
    return String(ticket.ticketTypeId) === String(selectedTicketTypeId.value)
  })
})

onMounted(() => {
  loadDashboard()
})

function getToken() {
  return localStorage.getItem('ticketToken')
}

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem('ticketUser')
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    localStorage.removeItem('ticketUser')
    return null
  }
}

async function readJsonResponse(response) {
  const text = await response.text()

  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

async function fetchAdminJson(path, options = {}) {
  const token = getToken()

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await readJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.error || `Admin request failed with ${response.status}.`)
  }

  return data
}

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''
  releaseMessage.value = ''
  currentUser.value = getStoredUser()

  if (!getToken() || !currentUser.value?.isAdmin) {
    loading.value = false
    errorMessage.value = 'You must sign in as admin to view this page.'
    return
  }

  try {
    const [holdingsData, ticketTypeData, auditLogData] = await Promise.all([
      fetchAdminJson('/api/admin/holdings'),
      fetchAdminJson('/api/admin/ticket-types'),
      fetchAdminJson('/api/admin/audit-logs'),
    ])

    holdings.value = holdingsData
    ticketTypes.value = ticketTypeData
    auditLogs.value = auditLogData.slice(0, 20)

    const selectionExists = ticketTypes.value.some((ticket) => {
      return String(ticket.ticketTypeId) === String(selectedTicketTypeId.value)
    })

    if (!selectionExists && ticketTypes.value.length > 0) {
      const mainTicket = ticketTypes.value.find((ticket) => ticket.eventId === 2)
      selectedTicketTypeId.value = String(
        mainTicket?.ticketTypeId || ticketTypes.value[0].ticketTypeId
      )
    }
  } catch (error) {
    errorMessage.value = error.message || 'Could not load admin data.'
  } finally {
    loading.value = false
  }
}

async function releaseTickets() {
  releaseMessage.value = ''

  const ticketTypeId = Number(selectedTicketTypeId.value)
  const quantity = Number(additionalQuantity.value)

  if (!Number.isInteger(ticketTypeId) || ticketTypeId <= 0) {
    releaseMessage.value = 'Choose a valid ticket type.'
    return
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    releaseMessage.value = 'Enter a whole number greater than zero.'
    return
  }

  releaseLoading.value = true

  try {
    const data = await fetchAdminJson('/api/admin/release-more', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticketTypeId,
        additionalQuantity: quantity,
      }),
    })

    releaseMessage.value = `Released ${quantity} more ticket${quantity === 1 ? '' : 's'} for ${selectedTicket.value?.eventTitle || 'the selected event'}.`
    const updatedTicket = data.ticket

    ticketTypes.value = ticketTypes.value.map((ticket) => {
      if (ticket.ticketTypeId !== updatedTicket.id) return ticket

      return {
        ...ticket,
        releasedQuantity: updatedTicket.releasedQuantity,
        soldQuantity: updatedTicket.soldQuantity,
        availableQuantity: updatedTicket.availableQuantity,
        isReleased: updatedTicket.isReleased,
      }
    })

    auditLogs.value = await fetchAdminJson('/api/admin/audit-logs')
    auditLogs.value = auditLogs.value.slice(0, 20)
  } catch (error) {
    releaseMessage.value = error.message || 'Could not release tickets.'
  } finally {
    releaseLoading.value = false
  }
}

async function reseedDatabase() {
  seedMessage.value = ''

  const secret = seedSecret.value.trim()

  if (!secret) {
    seedMessage.value = 'Enter the seed secret.'
    return
  }

  const confirmed = window.confirm(
    'Reseeding will reset users, tickets, purchases, and audit logs. Continue?'
  )

  if (!confirmed) return

  seedLoading.value = true

  try {
    const data = await fetchAdminJson('/api/admin/seed-database', {
      method: 'POST',
      headers: {
        'x-seed-secret': secret,
      },
    })

    seedSecret.value = ''
    await loadDashboard()
    seedMessage.value = data.message || 'Database seeded successfully.'
  } catch (error) {
    seedMessage.value = error.message || 'Could not reseed the database.'
  } finally {
    seedLoading.value = false
  }
}

function formatTime(value) {
  return new Date(value).toLocaleString()
}
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f2f2f2;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}

.admin-wrap {
  max-width: 1240px;
  margin: 36px auto 70px;
  padding: 0 24px;
}

.admin-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.admin-heading h1 {
  margin: 0 0 6px;
  font-size: 34px;
  line-height: 1.1;
}

.admin-heading p {
  margin: 0;
  color: #555;
  font-weight: 700;
}

.refresh-button,
.release-form button,
.reseed-form button {
  border: none;
  border-radius: 4px;
  background: #0057ff;
  color: white;
  font-size: 15px;
  font-weight: 900;
  padding: 12px 18px;
  cursor: pointer;
}

.refresh-button:disabled,
.release-form button:disabled,
.reseed-form button:disabled {
  background: #9bbcff;
  cursor: not-allowed;
}

.danger-button:not(:disabled) {
  background: #b00020;
}

.status-box {
  background: white;
  padding: 38px;
  border: 1px solid #d8d8d8;
  font-size: 18px;
}

.status-box.error {
  color: #b00020;
  font-weight: 800;
}

.admin-content {
  display: grid;
  gap: 26px;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background: white;
  border: 1px solid #d8d8d8;
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

.admin-section {
  background: white;
  border: 1px solid #d8d8d8;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  background: #e9e9e9;
  border-bottom: 1px solid #d4d4d4;
}

.section-heading h2 {
  margin: 0;
  font-size: 20px;
}

.section-heading span {
  color: #555;
  font-size: 14px;
  font-weight: 900;
}

.release-form {
  display: grid;
  grid-template-columns: 1.5fr 220px auto;
  gap: 16px;
  align-items: end;
  padding: 22px;
}

.reseed-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: end;
  padding: 22px;
}

.release-form label,
.reseed-form label {
  display: grid;
  gap: 7px;
  font-size: 13px;
  font-weight: 900;
  color: #444;
  text-transform: uppercase;
}

.release-form select,
.release-form input,
.reseed-form input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #bfc7d3;
  border-radius: 4px;
  padding: 12px 13px;
  color: #111;
  font-size: 16px;
  font-family: inherit;
  background: white;
}

.release-message {
  margin: 0;
  padding: 0 22px 22px;
  color: #333;
  font-weight: 800;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  min-width: 860px;
}

.table-header,
.table-row {
  display: grid;
  gap: 14px;
  align-items: center;
  padding: 14px 18px;
}

.inventory-table .table-header,
.inventory-table .table-row {
  grid-template-columns: 80px 1.5fr 1.2fr 0.8fr 0.8fr 0.7fr 0.8fr;
}

.holdings-table .table-header,
.holdings-table .table-row {
  grid-template-columns: 2fr 0.8fr 1.5fr 1.1fr 0.5fr 0.7fr 1.4fr;
}

.audit-table .table-header,
.audit-table .table-row {
  grid-template-columns: 1.5fr 1.8fr 1.4fr 0.7fr 0.9fr 0.7fr;
}

.table-header {
  background: #f5f5f5;
  border-bottom: 1px solid #d8d8d8;
  font-weight: 900;
}

.table-row {
  border-bottom: 1px solid #ececec;
}

.table-row:nth-child(odd) {
  background: #fafafa;
}

.table-row:last-child {
  border-bottom: none;
}

.success {
  color: #0f7a31;
  font-weight: 900;
}

.failure {
  color: #b00020;
  font-weight: 900;
}

@media (max-width: 900px) {
  .admin-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-row,
  .release-form,
  .reseed-form {
    grid-template-columns: 1fr;
  }

  .summary-row > div {
    border-right: none;
    border-bottom: 1px solid #d8d8d8;
  }

  .summary-row > div:last-child {
    border-bottom: none;
  }
}
</style>
