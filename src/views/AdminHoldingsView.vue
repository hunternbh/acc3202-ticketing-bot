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
            <div class="label">Users</div>
            <div class="summary-number">{{ uniqueUserCount }}</div>
          </div>

          <div>
            <div class="label">Tickets Sold</div>
            <div class="summary-number">{{ totalTickets }}</div>
          </div>

          <div>
            <div class="label">Revenue</div>
            <div class="summary-number">${{ totalRevenue.toFixed(2) }}</div>
          </div>

          <div>
            <div class="label">Trial Available</div>
            <div class="summary-number">{{ trialAvailableTickets }}</div>
          </div>

          <div>
            <div class="label">Main Available</div>
            <div class="summary-number">{{ mainAvailableTickets }}</div>
          </div>
        </section>

        <nav class="admin-tabs" aria-label="Admin panel tabs">
          <button
            type="button"
            :class="{ active: activeAdminTab === 'dashboard' }"
            @click="activeAdminTab = 'dashboard'"
          >
            Dashboard
          </button>

          <button
            type="button"
            :class="{ active: activeAdminTab === 'limits' }"
            @click="activeAdminTab = 'limits'"
          >
            Limits & Money
          </button>
        </nav>

        <div v-if="activeAdminTab === 'limits'" class="tab-panel">
          <section class="admin-section">
            <div class="section-heading">
              <h2>Ticket Limits</h2>
              <span>{{ ticketLimit }} per ticket type</span>
            </div>

            <form class="settings-form" @submit.prevent="updateTicketLimit">
              <label>
                Default User Limit
                <input
                  v-model.number="ticketLimitInput"
                  type="number"
                  min="1"
                  step="1"
                />
              </label>

              <button type="submit" :disabled="limitLoading">
                {{ limitLoading ? 'Saving...' : 'Save Limit' }}
              </button>
            </form>

            <p v-if="limitMessage" class="release-message">
              {{ limitMessage }}
            </p>

            <div class="table-wrap">
              <div class="limits-table table">
                <div class="table-header">
                  <div>Username</div>
                  <div>Account Type</div>
                  <div>Ticket Limit</div>
                </div>

                <div
                  v-for="row in userLimitRows"
                  :key="row.email"
                  class="table-row"
                >
                  <div>{{ row.email }}</div>
                  <div>{{ row.isAdmin ? 'Admin' : 'User' }}</div>
                  <div>{{ row.limitLabel }}</div>
                </div>
              </div>
            </div>
          </section>

          <section class="admin-section">
            <div class="section-heading">
              <h2>Increase User Money</h2>
              <span>Applies to every account</span>
            </div>

            <form class="settings-form" @submit.prevent="increaseAllWallets">
              <label>
                Amount to Add
                <input
                  v-model.number="walletIncreaseAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                />
              </label>

              <button type="submit" :disabled="walletTopUpLoading">
                {{ walletTopUpLoading ? 'Adding...' : 'Add Money' }}
              </button>
            </form>

            <p v-if="walletMessage" class="release-message">
              {{ walletMessage }}
            </p>
          </section>
        </div>

        <div v-else class="tab-panel">
        <section class="admin-section">
          <div class="section-heading">
            <h2>Reset Database</h2>
          </div>

          <form class="reseed-form" @submit.prevent="resetDatabase">
            <button
              type="submit"
              class="danger-button"
              :disabled="seedLoading"
            >
              {{ seedLoading ? 'Resetting...' : 'Reset Database' }}
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
            <h2>First to Buy Max Tickets</h2>
          </div>

          <div
            v-if="maxTicketBuyers.length === 0"
            class="empty-leaderboard"
            aria-label="No users have reached the maximum ticket limit yet"
          ></div>

          <div v-else class="table-wrap">
            <div class="max-ticket-table table">
              <div class="table-header">
                <div>Rank</div>
                <div>Username</div>
                <div>Event</div>
                <div>Ticket Type</div>
                <div>Limit</div>
                <div>Reached At</div>
              </div>

              <div
                v-for="(row, index) in maxTicketBuyers"
                :key="`${row.email}-${row.ticket_type_id}`"
                class="table-row"
              >
                <div>{{ index + 1 }}</div>
                <div>{{ row.email }}</div>
                <div>{{ row.event_title }}</div>
                <div>{{ row.ticket_type }}</div>
                <div>{{ Number(row.max_tickets || row.quantity_owned || 0) }}</div>
                <div>{{ formatTime(row.max_reached_at) }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="admin-section">
          <div class="section-heading">
            <h2>All User Ticket Holdings</h2>
          </div>

          <div class="table-wrap">
            <div class="holdings-table table">
              <div class="table-header">
                <div>Username</div>
                <div>Wallet</div>
                <div>Event</div>
                <div>Ticket Type</div>
                <div>Qty</div>
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
                <div>{{ row.last_purchase_at ? formatTime(row.last_purchase_at) : '-' }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="admin-section">
          <div class="section-heading">
            <h2>Revenue</h2>
          </div>

          <div class="table-wrap">
            <div class="revenue-table table">
              <div class="table-header">
                <div>Username</div>
                <div>Event</div>
                <div>Ticket Type</div>
                <div>Qty</div>
                <div>Unit Price</div>
                <div>Revenue</div>
                <div>Last Purchase</div>
              </div>

              <div
                v-for="(row, index) in revenueRows"
                :key="`${row.email}-${row.event_title}-${row.ticket_type}-${row.unit_price}-${index}`"
                class="table-row"
              >
                <div>{{ row.email }}</div>
                <div>{{ row.event_title }}</div>
                <div>{{ row.ticket_type }}</div>
                <div>{{ Number(row.quantity_sold || 0) }}</div>
                <div>${{ Number(row.unit_price || 0).toFixed(2) }}</div>
                <div>${{ Number(row.revenue || 0).toFixed(2) }}</div>
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
const limitLoading = ref(false)
const walletTopUpLoading = ref(false)
const errorMessage = ref('')
const releaseMessage = ref('')
const seedMessage = ref('')
const limitMessage = ref('')
const walletMessage = ref('')
const holdings = ref([])
const maxTicketBuyers = ref([])
const revenueRows = ref([])
const ticketTypes = ref([])
const auditLogs = ref([])
const currentUser = ref(null)
const activeAdminTab = ref('dashboard')
const selectedTicketTypeId = ref('')
const additionalQuantity = ref(10)
const ticketLimit = ref(3)
const ticketLimitInput = ref(3)
const walletIncreaseAmount = ref(1)

const uniqueUserCount = computed(() => {
  return new Set(holdings.value.map((row) => row.email)).size
})

const totalTickets = computed(() => {
  return holdings.value.reduce((sum, row) => {
    return sum + Number(row.quantity_owned || 0)
  }, 0)
})

const totalRevenue = computed(() => {
  return revenueRows.value.reduce((sum, row) => {
    return sum + Number(row.revenue || 0)
  }, 0)
})

const trialAvailableTickets = computed(() => {
  return ticketTypes.value.reduce((sum, ticket) => {
    return ticket.eventId === 1
      ? sum + Number(ticket.availableQuantity || 0)
      : sum
  }, 0)
})

const mainAvailableTickets = computed(() => {
  return ticketTypes.value.reduce((sum, ticket) => {
    return ticket.eventId === 2
      ? sum + Number(ticket.availableQuantity || 0)
      : sum
  }, 0)
})

const selectedTicket = computed(() => {
  return ticketTypes.value.find((ticket) => {
    return String(ticket.ticketTypeId) === String(selectedTicketTypeId.value)
  })
})

const userLimitRows = computed(() => {
  const usersByEmail = new Map()

  for (const row of holdings.value) {
    if (row.email && !usersByEmail.has(row.email)) {
      usersByEmail.set(row.email, row)
    }
  }

  return Array.from(usersByEmail.values())
    .sort((a, b) => String(a.email).localeCompare(String(b.email), undefined, {
      numeric: true,
      sensitivity: 'base',
    }))
    .map((row) => {
      const isAdmin = Boolean(row.is_admin)

      return {
        email: row.email,
        isAdmin,
        limitLabel: isAdmin ? 'No cap' : `${ticketLimit.value} per ticket type`,
      }
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
  limitMessage.value = ''
  walletMessage.value = ''
  currentUser.value = getStoredUser()

  if (!getToken() || !currentUser.value?.isAdmin) {
    loading.value = false
    errorMessage.value = 'You must sign in as admin to view this page.'
    return
  }

  try {
    const [
      holdingsData,
      maxTicketBuyerData,
      revenueData,
      ticketTypeData,
      auditLogData,
      ticketLimitData,
    ] = await Promise.all([
      fetchAdminJson('/api/admin/holdings'),
      fetchAdminJson('/api/admin/max-ticket-buyers'),
      fetchAdminJson('/api/admin/revenue'),
      fetchAdminJson('/api/admin/ticket-types'),
      fetchAdminJson('/api/admin/audit-logs'),
      fetchAdminJson('/api/admin/ticket-limit'),
    ])

    holdings.value = holdingsData
    maxTicketBuyers.value = maxTicketBuyerData
    revenueRows.value = revenueData
    ticketTypes.value = ticketTypeData
    auditLogs.value = auditLogData.slice(0, 20)
    ticketLimit.value = Number(ticketLimitData.limit || 3)
    ticketLimitInput.value = ticketLimit.value

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

function parsePositiveInteger(value) {
  const numericValue = Number(value)
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null
}

async function updateTicketLimit() {
  limitMessage.value = ''
  const limit = parsePositiveInteger(ticketLimitInput.value)

  if (!limit) {
    limitMessage.value = 'Enter a whole number greater than zero.'
    return
  }

  limitLoading.value = true

  try {
    const data = await fetchAdminJson('/api/admin/ticket-limit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit }),
    })

    ticketLimit.value = Number(data.limit)
    ticketLimitInput.value = ticketLimit.value

    const [maxTicketBuyerData, auditLogData] = await Promise.all([
      fetchAdminJson('/api/admin/max-ticket-buyers'),
      fetchAdminJson('/api/admin/audit-logs'),
    ])

    maxTicketBuyers.value = maxTicketBuyerData
    auditLogs.value = auditLogData.slice(0, 20)
    limitMessage.value = `Ticket limit updated to ${ticketLimit.value} per ticket type.`
  } catch (error) {
    limitMessage.value = error.message || 'Could not update the ticket limit.'
  } finally {
    limitLoading.value = false
  }
}

async function increaseAllWallets() {
  walletMessage.value = ''
  const amount = Number(walletIncreaseAmount.value)

  if (!Number.isFinite(amount) || amount <= 0) {
    walletMessage.value = 'Enter an amount greater than zero.'
    return
  }

  walletTopUpLoading.value = true

  try {
    const data = await fetchAdminJson('/api/admin/increase-wallets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    })

    const [holdingsData, auditLogData] = await Promise.all([
      fetchAdminJson('/api/admin/holdings'),
      fetchAdminJson('/api/admin/audit-logs'),
    ])

    holdings.value = holdingsData
    auditLogs.value = auditLogData.slice(0, 20)
    updateStoredAdminWallet()
    walletMessage.value =
      `Added $${Number(data.amount).toFixed(2)} to ${data.usersUpdated} accounts.`
  } catch (error) {
    walletMessage.value = error.message || 'Could not increase user money.'
  } finally {
    walletTopUpLoading.value = false
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

async function resetDatabase() {
  seedMessage.value = ''

  const confirmed = window.confirm(
    'This will reset users, tickets, purchases, and audit logs. Continue?'
  )

  if (!confirmed) return

  seedLoading.value = true

  try {
    const data = await fetchAdminJson('/api/admin/reset-database', {
      method: 'POST',
    })

    await loadDashboard()
    seedMessage.value = data.message || 'Database reset successfully.'
  } catch (error) {
    seedMessage.value = error.message || 'Could not reset the database.'
  } finally {
    seedLoading.value = false
  }
}

function formatTime(value) {
  return new Date(value).toLocaleString()
}

function updateStoredAdminWallet() {
  const adminRow = holdings.value.find((row) => row.email === currentUser.value?.email)

  if (!adminRow || !currentUser.value) return

  const updatedUser = {
    ...currentUser.value,
    walletBalance: Number(adminRow.wallet_balance),
  }

  currentUser.value = updatedUser
  localStorage.setItem('ticketUser', JSON.stringify(updatedUser))
  window.dispatchEvent(new Event('ticket-user-updated'))
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
.reseed-form button,
.settings-form button {
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
.reseed-form button:disabled,
.settings-form button:disabled {
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

.admin-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #cfcfcf;
}

.admin-tabs button {
  border: 1px solid #cfcfcf;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  background: #e7e7e7;
  color: #333;
  padding: 12px 18px;
  font: inherit;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.admin-tabs button.active {
  background: white;
  color: #111;
}

.tab-panel {
  display: grid;
  gap: 26px;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
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
  display: flex;
  padding: 22px;
}

.settings-form {
  display: grid;
  grid-template-columns: minmax(240px, 340px) auto;
  gap: 16px;
  align-items: end;
  padding: 22px;
}

.release-form label,
.settings-form label {
  display: grid;
  gap: 7px;
  font-size: 13px;
  font-weight: 900;
  color: #444;
  text-transform: uppercase;
}

.release-form select,
.release-form input,
.settings-form input {
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
  grid-template-columns: 2fr 0.8fr 1.5fr 1.1fr 0.5fr 1.4fr;
}

.max-ticket-table .table-header,
.max-ticket-table .table-row {
  grid-template-columns: 80px 1.8fr 1.6fr 1.1fr 0.7fr 1.5fr;
}

.limits-table .table-header,
.limits-table .table-row {
  grid-template-columns: 2fr 1fr 1.3fr;
}

.revenue-table .table-header,
.revenue-table .table-row {
  grid-template-columns: 2fr 1.5fr 1.1fr 0.5fr 0.8fr 0.8fr 1.4fr;
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

.empty-leaderboard {
  min-height: 72px;
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
  .reseed-form,
  .settings-form {
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
