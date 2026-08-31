<template>
  <main class="automated-buy-page">
    <SiteHeader :show-title="false" :show-search="false" />

    <section class="automated-buy-wrap">
      <div v-if="checkingAccess" class="status-box">
        Loading...
      </div>

      <div v-else-if="accessError" class="status-box error">
        {{ accessError }}
      </div>

      <div v-else class="automated-buy-content">
        <header class="page-heading">
          <h1>Automated Buy Demonstration</h1>
        </header>

        <section class="demo-card">
          <h2>Automated Buy</h2>

          <form class="automated-buy-form" @submit.prevent="automatedBuy">
            <label class="field-control">
              <span>Ticket Class</span>
              <select
                v-model.number="selectedTicketTypeId"
                :disabled="buying || ticketTypes.length === 0"
              >
                <option
                  v-for="ticket in ticketTypes"
                  :key="ticket.ticketTypeId"
                  :value="ticket.ticketTypeId"
                >
                  {{ formatTicketOption(ticket) }}
                </option>
              </select>
            </label>

            <label class="field-control quantity-control">
              <span>Quantity</span>
              <input
                v-model.number="quantityToBuy"
                type="number"
                min="1"
                step="1"
                :disabled="buying"
              />
            </label>

            <button class="automated-buy-button" type="submit" :disabled="buying || !selectedTicket">
              {{ buying ? 'Buying...' : 'Buy Tickets' }}
            </button>
          </form>

          <div v-if="resultMessage" class="result-box" :class="{ error: resultIsError }">
            {{ resultMessage }}
          </div>
        </section>

        <section class="code-card">
          <h2>Pseudocode</h2>
          <pre><code>{{ pseudocode }}</code></pre>
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

const accessError = ref('')
const checkingAccess = ref(true)
const buying = ref(false)
const resultMessage = ref('')
const resultIsError = ref(false)
const ticketTypes = ref([])
const selectedTicketTypeId = ref(null)
const quantityToBuy = ref(1)

const selectedTicket = computed(() =>
  ticketTypes.value.find((ticket) => ticket.ticketTypeId === Number(selectedTicketTypeId.value))
)

const pseudocode = computed(() => {
  const ticket = selectedTicket.value
  const eventId = ticket?.eventId || 'selectedTicket.eventId'
  const ticketTypeId = ticket?.ticketTypeId || 'selectedTicket.ticketTypeId'
  const quantity = parsePositiveInteger(quantityToBuy.value) || 'quantity'

  return `token = SIGN_IN("admin", "adminpass2")

ticket = SELECT_TICKET_CLASS("${ticket ? `${ticket.eventTitle} - ${ticket.ticketType}` : 'ticket class'}")
quantity = ${quantity}

POST("/api/purchase",
  headers = {
    "Authorization": "Bearer " + token
  },
  body = {
    "eventId": ${eventId},
    "items": [
      {
        "ticketTypeId": ${ticketTypeId},
        "quantity": quantity
      }
    ]
  }
)`
})

onMounted(async () => {
  const token = localStorage.getItem('ticketToken')

  if (!token) {
    accessError.value = 'Admin access required.'
    checkingAccess.value = false
    return
  }

  try {
    const response = await fetch(`${API_BASE}/api/admin/automated-buy/access`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      accessError.value = 'Admin access required.'
      return
    }

    await loadTicketTypes(token)
  } catch (error) {
    accessError.value = error.message || 'Admin access required.'
  } finally {
    checkingAccess.value = false
  }
})

async function readJsonResponse(response) {
  const text = await response.text()

  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

async function loadTicketTypes(token) {
  const response = await fetch(`${API_BASE}/api/admin/ticket-types`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await readJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.error || 'Ticket classes are unavailable.')
  }

  ticketTypes.value = data.map((ticket) => ({
    ...ticket,
    ticketTypeId: Number(ticket.ticketTypeId),
    eventId: Number(ticket.eventId),
    price: Number(ticket.price),
    availableQuantity: Number(ticket.availableQuantity),
  }))

  const firstReleasedTicket = ticketTypes.value.find((ticket) => ticket.isReleased)
  selectedTicketTypeId.value =
    firstReleasedTicket?.ticketTypeId || ticketTypes.value[0]?.ticketTypeId || null
}

async function automatedBuy() {
  const token = localStorage.getItem('ticketToken')
  const ticket = selectedTicket.value
  const quantity = parsePositiveInteger(quantityToBuy.value)

  if (!token) {
    accessError.value = 'Admin access required.'
    return
  }

  if (!ticket) {
    resultIsError.value = true
    resultMessage.value = 'Select a ticket class before buying.'
    return
  }

  if (!quantity) {
    resultIsError.value = true
    resultMessage.value = 'Quantity must be a whole number greater than 0.'
    return
  }

  buying.value = true
  resultMessage.value = ''
  resultIsError.value = false

  try {
    const purchaseResponse = await fetch(`${API_BASE}/api/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        eventId: ticket.eventId,
        items: [{ ticketTypeId: ticket.ticketTypeId, quantity }],
      }),
    })
    const purchaseData = await readJsonResponse(purchaseResponse)

    if (!purchaseResponse.ok) {
      throw new Error(purchaseData.error || 'Automated purchase failed.')
    }

    updateStoredWallet(purchaseData.walletBalance)
    resultMessage.value =
      `SUCCESS - Purchase #${purchaseData.purchaseId} - ${quantity} ${ticket.ticketType}`
  } catch (error) {
    resultIsError.value = true
    resultMessage.value = error.message || 'Automated purchase failed.'
  } finally {
    buying.value = false
  }
}

function parsePositiveInteger(value) {
  const numericValue = Number(value)
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`
}

function formatTicketOption(ticket) {
  const availability = ticket.isReleased
    ? `${ticket.availableQuantity} available`
    : 'not released'

  return `${ticket.eventTitle} - ${ticket.ticketType} - ${formatCurrency(ticket.price)} - ${availability}`
}

function updateStoredWallet(walletBalance) {
  try {
    const storedUser = localStorage.getItem('ticketUser')

    if (!storedUser) return

    const user = JSON.parse(storedUser)
    user.walletBalance = walletBalance
    localStorage.setItem('ticketUser', JSON.stringify(user))
    window.dispatchEvent(new Event('ticket-user-updated'))
  } catch {
    // The purchase result remains valid if local display state cannot be updated.
  }
}
</script>

<style scoped>
.automated-buy-page {
  min-height: 100vh;
  background: #f2f2f2;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}

.automated-buy-wrap {
  max-width: 960px;
  margin: 36px auto 70px;
  padding: 0 24px;
}

.automated-buy-content {
  display: grid;
  gap: 24px;
}

.page-heading h1 {
  margin: 0;
  font-size: 36px;
}

.demo-card,
.code-card,
.status-box {
  background: white;
  border: 1px solid #d8d8d8;
  padding: 28px;
}

.demo-card h2,
.code-card h2 {
  margin: 0 0 22px;
  font-size: 24px;
}

.automated-buy-form {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(120px, 180px) auto;
  gap: 16px;
  align-items: end;
}

.field-control {
  display: grid;
  gap: 8px;
  color: #3f3f46;
  font-size: 14px;
  font-weight: 800;
}

.field-control select,
.field-control input {
  width: 100%;
  min-height: 52px;
  border: 1px solid #cfcfcf;
  border-radius: 5px;
  background: white;
  color: #111;
  padding: 0 14px;
  font: inherit;
  font-weight: 700;
}

.automated-buy-button {
  border: none;
  border-radius: 5px;
  background: #b00020;
  color: white;
  padding: 16px 28px;
  font-size: 18px;
  font-weight: 900;
  cursor: pointer;
}

.automated-buy-button:disabled {
  background: #c98d98;
  cursor: not-allowed;
}

.result-box {
  margin-top: 22px;
  border-left: 6px solid #0f7a31;
  background: #effaf2;
  padding: 16px 18px;
  color: #0f7a31;
  font-weight: 900;
}

.result-box.error,
.status-box.error {
  border-left: 6px solid #b00020;
  background: #fff2f4;
  color: #b00020;
  font-weight: 900;
}

pre {
  margin: 0;
  overflow-x: auto;
  border-radius: 5px;
  background: #111827;
  color: #f8fafc;
  padding: 24px;
  font-size: 16px;
  line-height: 1.55;
}

@media (max-width: 650px) {
  .automated-buy-wrap {
    padding: 0 16px;
  }

  .automated-buy-form {
    grid-template-columns: 1fr;
  }

  .demo-card,
  .code-card,
  .status-box {
    padding: 20px;
  }

  .page-heading h1 {
    font-size: 30px;
  }
}
</style>
