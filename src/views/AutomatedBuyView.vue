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

          <button class="automated-buy-button" :disabled="buying" @click="automatedBuy">
            {{ buying ? 'Buying 5 Tickets...' : 'Automated Buy' }}
          </button>

          <div v-if="resultMessage" class="result-box" :class="{ error: resultIsError }">
            {{ resultMessage }}
          </div>
        </section>

        <section class="code-card">
          <h2>Pseudocode</h2>
          <pre><code>token = SIGN_IN("admin", "adminpass2")

ticket = GET("/api/events/1/tickets").tickets[0]

POST("/api/purchase",
  headers = {
    "Authorization": "Bearer " + token
  },
  body = {
    "eventId": 1,
    "items": [
      {
        "ticketTypeId": ticket.id,
        "quantity": 5
      }
    ]
  }
)</code></pre>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://acc3202-ticketing-bot.onrender.com'

const accessError = ref('')
const checkingAccess = ref(true)
const buying = ref(false)
const resultMessage = ref('')
const resultIsError = ref(false)

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
    }
  } catch {
    accessError.value = 'Admin access required.'
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

async function automatedBuy() {
  const token = localStorage.getItem('ticketToken')

  if (!token) {
    accessError.value = 'Admin access required.'
    return
  }

  buying.value = true
  resultMessage.value = ''
  resultIsError.value = false

  try {
    const ticketResponse = await fetch(`${API_BASE}/api/events/1/tickets`)
    const ticketData = await readJsonResponse(ticketResponse)
    const ticket = ticketData.tickets?.[0]

    if (!ticketResponse.ok || !ticket) {
      throw new Error(ticketData.error || 'Trial Tickets are unavailable.')
    }

    const purchaseResponse = await fetch(`${API_BASE}/api/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        eventId: 1,
        items: [{ ticketTypeId: ticket.id, quantity: 5 }],
      }),
    })
    const purchaseData = await readJsonResponse(purchaseResponse)

    if (!purchaseResponse.ok) {
      throw new Error(purchaseData.error || 'Automated purchase failed.')
    }

    updateStoredWallet(purchaseData.walletBalance)
    resultMessage.value = `SUCCESS — Purchase #${purchaseData.purchaseId} — 5 Trial Tickets`
  } catch (error) {
    resultIsError.value = true
    resultMessage.value = error.message || 'Automated purchase failed.'
  } finally {
    buying.value = false
  }
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
