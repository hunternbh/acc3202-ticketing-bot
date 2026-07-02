<template>
  <main class="cart-page">
    <SiteHeader :show-title="false" :show-search="false" />

    <section class="cart-wrap">
      <div class="cart-panel">
        <div class="panel-header">Confirm Your Tickets</div>

        <div v-if="cart" class="cart-content">
          <section class="event-summary">
            <img :src="cart.eventImage" :alt="cart.eventTitle" />

            <div>
              <h1>{{ cart.eventTitle }}</h1>
              <p class="meta">{{ cart.eventDate }}</p>
              <p class="meta">{{ cart.eventVenue }}</p>
              <p class="notice">
                Review your ticket selection before submitting the purchase.
              </p>
            </div>
          </section>

          <section class="wallet-box">
            <div>
              <div class="wallet-label">Wallet Balance</div>
              <div class="wallet-amount">${{ walletBalance.toFixed(2) }}</div>
            </div>

            <div>
              <div class="wallet-label">Order Total</div>
              <div class="order-total">${{ cart.total.toFixed(2) }}</div>
            </div>

            <div>
              <div class="wallet-label">Balance After Purchase</div>
              <div
                class="after-balance"
                :class="{ negative: balanceAfterPurchase < 0 }"
              >
                ${{ balanceAfterPurchase.toFixed(2) }}
              </div>
            </div>
          </section>

          <section class="ticket-table">
            <div class="ticket-header">
              <div>Ticket</div>
              <div>Price</div>
              <div>Quantity</div>
              <div>Subtotal</div>
            </div>

            <div
              v-for="ticket in cart.tickets"
              :key="ticket.id"
              class="ticket-row"
            >
              <div>{{ ticket.name }}</div>
              <div>${{ ticket.price.toFixed(2) }}</div>
              <div>{{ ticket.quantity }}</div>
              <div>${{ ticket.subtotal.toFixed(2) }}</div>
            </div>
          </section>

          <section class="audit-note">
            <h2>Audit Trail Notice</h2>
            <p>
              In the full sandbox version, this confirmation step will generate
              purchase-attempt logs, wallet-balance checks, inventory checks, and
              success or failure outcomes for later audit testing.
            </p>
          </section>

          <section class="actions">
            <button class="back-button" @click="goBack">
              Back to Event
            </button>

            <button class="purchase-button" @click="openIntegrityCheck">
              Confirm Purchase
            </button>
          </section>
        </div>

        <div v-else class="empty-cart">
          <h1>No tickets selected</h1>
          <p>Return to the concerts page and choose an event.</p>
          <button @click="router.push('/concerts')">Back to Concerts</button>
        </div>
      </div>
    </section>

    <section
      v-if="showIntegrityCheck"
      class="verification-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-title"
    >
      <div class="verification-modal">
        <div class="modal-header">Verification Required</div>

        <div class="modal-body">
          <h2 id="verification-title">Confirm Class Details</h2>

          <label for="class-code">Class</label>
          <input
            id="class-code"
            v-model="classEntry"
            type="text"
            autocomplete="off"
            autocapitalize="characters"
            placeholder="Class name"
            @keyup.enter="confirmPurchase"
          />

          <label for="class-date">Date</label>
          <input
            id="class-date"
            v-model="dateEntry"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            maxlength="8"
            placeholder="MMDDYYYY"
            @input="dateEntry = dateEntry.replace(/\D/g, '').slice(0, 8)"
            @keyup.enter="confirmPurchase"
          />

          <p v-if="verificationError" class="verification-error">
            {{ verificationError }}
          </p>
        </div>

        <div class="modal-actions">
          <button class="cancel-button" @click="closeIntegrityCheck">
            Cancel
          </button>
          <button class="verify-button" @click="confirmPurchase">
            Continue
          </button>
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
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://acc3202-ticketing-bot.onrender.com'

const storedCart = localStorage.getItem('ticketCart')
const cart = ref(storedCart ? JSON.parse(storedCart) : null)
const showIntegrityCheck = ref(false)
const classEntry = ref('')
const dateEntry = ref('')
const verificationError = ref('')

const walletBalance = ref(readStoredWalletBalance())

const balanceAfterPurchase = computed(() => {
  if (!cart.value) return walletBalance.value
  return walletBalance.value - cart.value.total
})

onMounted(() => {
  loadWalletBalance()
})

function readStoredWalletBalance() {
  try {
    const storedUser = localStorage.getItem('ticketUser')
    const user = storedUser ? JSON.parse(storedUser) : null
    const balance = Number(user?.walletBalance)

    return Number.isFinite(balance) ? balance : 0
  } catch {
    return 0
  }
}

function updateStoredWalletBalance(balance) {
  try {
    const storedUser = localStorage.getItem('ticketUser')

    if (!storedUser) return

    const user = JSON.parse(storedUser)
    user.walletBalance = balance
    localStorage.setItem('ticketUser', JSON.stringify(user))
    window.dispatchEvent(new Event('ticket-user-updated'))
  } catch {
    localStorage.removeItem('ticketUser')
  }
}

async function loadWalletBalance() {
  const token = localStorage.getItem('ticketToken')

  if (!token) return

  try {
    const response = await fetch(`${API_BASE}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return
    }

    walletBalance.value = Number(data.walletBalance)
    updateStoredWalletBalance(walletBalance.value)
  } catch {
    walletBalance.value = readStoredWalletBalance()
  }
}

function isSignedIn() {
  return Boolean(localStorage.getItem('ticketToken') && localStorage.getItem('ticketUser'))
}

function goBack() {
  if (cart.value?.eventId) {
    router.push(`/events/${cart.value.eventId}`)
  } else {
    router.push('/concerts')
  }
}

function openIntegrityCheck() {
  if (!isSignedIn()) {
    localStorage.removeItem('ticketToken')
    localStorage.removeItem('ticketUser')
    localStorage.setItem(
      'ticketPurchaseResult',
      JSON.stringify({
        eventTitle: cart.value?.eventTitle || 'Selected event',
        eventDate: cart.value?.eventDate || '',
        eventVenue: cart.value?.eventVenue || '',
        tickets: cart.value?.tickets || [],
        total: cart.value?.total || 0,
        walletBalance: 0,
        balanceAfterPurchase: 0,
        failureReason: 'You must sign in before purchasing tickets.',
        timestamp: new Date().toISOString(),
      })
    )
    router.push('/purchase/failure')
    return
  }

  classEntry.value = ''
  dateEntry.value = ''
  verificationError.value = ''
  showIntegrityCheck.value = true
}

function closeIntegrityCheck() {
  showIntegrityCheck.value = false
  classEntry.value = ''
  dateEntry.value = ''
  verificationError.value = ''
}

function expectedDateCode() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const year = String(today.getFullYear())
  return `${month}${day}${year}`
}

function isValidDateCode(value) {
  if (!/^\d{8}$/.test(value)) return false

  const month = Number(value.slice(0, 2))
  const day = Number(value.slice(2, 4))
  const year = Number(value.slice(4, 8))
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function validateIntegrityCheck() {
  const normalizedClass = classEntry.value.trim()
  const expectedDate = expectedDateCode()

  if (!normalizedClass) {
    verificationError.value = 'Enter your class.'
    return false
  }

  if (!isValidDateCode(dateEntry.value)) {
    verificationError.value = 'Enter a valid date in MMDDYYYY form.'
    return false
  }

  if (dateEntry.value !== expectedDate) {
    verificationError.value = 'Enter today\'s date in MMDDYYYY form.'
    return false
  }

  verificationError.value = ''
  return true
}

async function confirmPurchase() {
  if (!validateIntegrityCheck()) return

  await loadWalletBalance()

  if (!cart.value) {
    router.push('/purchase/failure')
    return
  }

  const token = localStorage.getItem('ticketToken')
  const storedUser = localStorage.getItem('ticketUser')

  if (!token || !storedUser) {
    localStorage.removeItem('ticketToken')
    localStorage.removeItem('ticketUser')

    localStorage.setItem(
      'ticketPurchaseResult',
      JSON.stringify({
        eventTitle: cart.value.eventTitle,
        eventDate: cart.value.eventDate,
        eventVenue: cart.value.eventVenue,
        tickets: cart.value.tickets,
        total: cart.value.total,
        walletBalance: walletBalance.value,
        balanceAfterPurchase: balanceAfterPurchase.value,
        failureReason: 'You must sign in before purchasing tickets.',
        timestamp: new Date().toISOString(),
      })
    )

    router.push('/purchase/failure')
    return
  }

  try {
    const response = await fetch(`${API_BASE}/api/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        eventId: cart.value.eventId,
        items: cart.value.tickets.map((ticket) => ({
          ticketTypeId: ticket.id,
          quantity: ticket.quantity,
        })),
      }),
    })

    const data = await response.json()
    const resultWalletBalance = data.walletBalance ?? walletBalance.value

    const result = {
      eventTitle: cart.value.eventTitle,
      eventDate: cart.value.eventDate,
      eventVenue: cart.value.eventVenue,
      tickets: cart.value.tickets,
      total: cart.value.total,
      walletBalance: resultWalletBalance,
      balanceAfterPurchase: resultWalletBalance,
      purchaseId: data.purchaseId,
      failureReason: data.error,
      timestamp: new Date().toISOString(),
    }

    localStorage.setItem('ticketPurchaseResult', JSON.stringify(result))

    if (!response.ok) {
      router.push('/purchase/failure')
      return
    }

    walletBalance.value = Number(data.walletBalance)
    updateStoredWalletBalance(walletBalance.value)

    localStorage.removeItem('ticketCart')
    closeIntegrityCheck()
    router.push('/purchase/success')
  } catch (error) {
    localStorage.setItem(
      'ticketPurchaseResult',
      JSON.stringify({
        eventTitle: cart.value.eventTitle,
        eventDate: cart.value.eventDate,
        eventVenue: cart.value.eventVenue,
        tickets: cart.value.tickets,
        total: cart.value.total,
        walletBalance: walletBalance.value,
        balanceAfterPurchase: balanceAfterPurchase.value,
        failureReason: 'Could not connect to the purchase server.',
        timestamp: new Date().toISOString(),
      })
    )

    router.push('/purchase/failure')
  }
}
</script>

<style scoped>
.cart-page {
  min-height: 100vh;
  background: #f2f2f2;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}

.cart-wrap {
  max-width: 1050px;
  margin: 42px auto 70px;
  padding: 0 24px;
}

.cart-panel {
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

.cart-content {
  padding: 32px 42px 38px;
}

.event-summary {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
  align-items: center;
  margin-bottom: 30px;
}

.event-summary img {
  width: 220px;
  height: 145px;
  object-fit: cover;
  background: #222;
}

.event-summary h1 {
  margin: 0 0 12px;
  font-size: 32px;
  line-height: 1.1;
}

.meta {
  margin: 4px 0;
  font-size: 16px;
}

.notice {
  margin-top: 16px;
  color: #444;
}

.wallet-box {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border: 1px solid #d8d8d8;
  margin-bottom: 34px;
}

.wallet-box > div {
  padding: 20px 22px;
  border-right: 1px solid #d8d8d8;
}

.wallet-box > div:last-child {
  border-right: none;
}

.wallet-label {
  font-size: 13px;
  font-weight: 800;
  color: #555;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.wallet-amount,
.order-total,
.after-balance {
  font-size: 28px;
  font-weight: 900;
}

.after-balance.negative {
  color: #b00020;
}

.ticket-table {
  border-top: 1px solid #cfcfcf;
  border-bottom: 1px solid #cfcfcf;
}

.ticket-header,
.ticket-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  align-items: center;
  padding: 16px 18px;
}

.ticket-header {
  font-weight: 800;
  background: #f5f5f5;
}

.ticket-row:nth-child(odd) {
  background: #ededed;
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

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 32px;
}

.back-button,
.purchase-button,
.empty-cart button {
  border: none;
  padding: 15px 24px;
  border-radius: 26px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}

.back-button {
  background: #e3e3e3;
  color: #111;
}

.purchase-button {
  background: #2c70bd;
  color: white;
  min-width: 210px;
}

.verification-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.55);
}

.verification-modal {
  width: min(100%, 430px);
  background: white;
  border-radius: 6px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.modal-header {
  background: #e9e9e9;
  padding: 14px 22px;
  border-bottom: 1px solid #d4d4d4;
  font-size: 18px;
  font-weight: 800;
}

.modal-body {
  padding: 24px 26px 8px;
}

.modal-body h2 {
  margin: 0 0 20px;
  font-size: 25px;
  line-height: 1.15;
}

.modal-body label {
  display: block;
  margin: 16px 0 7px;
  font-size: 13px;
  font-weight: 900;
  color: #444;
  text-transform: uppercase;
}

.modal-body input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #bfc7d3;
  border-radius: 4px;
  padding: 13px 14px;
  font-size: 18px;
  font-family: inherit;
}

.modal-body input:focus {
  outline: 3px solid rgba(0, 87, 255, 0.18);
  border-color: #0057ff;
}

.verification-error {
  min-height: 22px;
  margin: 14px 0 0;
  color: #b00020;
  font-size: 14px;
  font-weight: 800;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px 26px;
}

.cancel-button,
.verify-button {
  border: none;
  padding: 13px 22px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
}

.cancel-button {
  background: #e3e3e3;
  color: #111;
}

.verify-button {
  background: #2c70bd;
  color: white;
}

.empty-cart {
  padding: 50px;
}

.empty-cart h1 {
  margin-top: 0;
}

.empty-cart button {
  background: #0057ff;
  color: white;
}

@media (max-width: 780px) {
  .event-summary,
  .wallet-box,
  .ticket-header,
  .ticket-row {
    grid-template-columns: 1fr;
  }

  .event-summary img {
    width: 100%;
    height: 220px;
  }

  .wallet-box > div {
    border-right: none;
    border-bottom: 1px solid #d8d8d8;
  }

  .wallet-box > div:last-child {
    border-bottom: none;
  }

  .ticket-header {
    display: none;
  }

  .actions {
    flex-direction: column;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }
}
</style>
