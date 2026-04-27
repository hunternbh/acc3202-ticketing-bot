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

            <button class="purchase-button" @click="confirmPurchase">
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
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'

const router = useRouter()

const storedCart = localStorage.getItem('ticketCart')
const cart = ref(storedCart ? JSON.parse(storedCart) : null)

/*
  For now this is hardcoded.
  Later, this should come from the backend user account table.
*/
const walletBalance = ref(5)

const balanceAfterPurchase = computed(() => {
  if (!cart.value) return walletBalance.value
  return walletBalance.value - cart.value.total
})

function goBack() {
  if (cart.value?.eventId) {
    router.push(`/events/${cart.value.eventId}`)
  } else {
    router.push('/concerts')
  }
}

async function confirmPurchase() {
  if (!cart.value) {
    router.push('/purchase/failure')
    return
  }

  const API_BASE = import.meta.env.VITE_API_BASE_URL
  const token = localStorage.getItem('ticketToken')

  if (!token) {
    localStorage.setItem(
      'ticketPurchaseResult',
      JSON.stringify({
        eventTitle: cart.value.eventTitle,
        eventDate: cart.value.eventDate,
        eventVenue: cart.value.eventVenue,
        tickets: cart.value.tickets,
        total: cart.value.total,
        walletBalance: 0,
        balanceAfterPurchase: 0,
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

    const result = {
      eventTitle: cart.value.eventTitle,
      eventDate: cart.value.eventDate,
      eventVenue: cart.value.eventVenue,
      tickets: cart.value.tickets,
      total: cart.value.total,
      walletBalance: data.walletBalance ?? 0,
      balanceAfterPurchase: data.walletBalance ?? 0,
      purchaseId: data.purchaseId,
      failureReason: data.error,
      timestamp: new Date().toISOString(),
    }

    localStorage.setItem('ticketPurchaseResult', JSON.stringify(result))

    if (!response.ok) {
      router.push('/purchase/failure')
      return
    }

    const storedUser = localStorage.getItem('ticketUser')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      user.walletBalance = data.walletBalance
      localStorage.setItem('ticketUser', JSON.stringify(user))
    }

    localStorage.removeItem('ticketCart')
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
        walletBalance: 0,
        balanceAfterPurchase: 0,
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
}
</style>