<template>
  <main class="event-page">
    <SiteHeader :show-title="false" :show-search="false" />

    <section v-if="event" class="event-hero">
      <img :src="event.image" :alt="event.title" class="hero-bg" />
      <div class="hero-overlay"></div>

      <div class="event-title-block">
        <h1>{{ event.title }}</h1>
        <p>{{ event.tagline }}</p>
      </div>
    </section>

    <section v-if="event" class="detail-wrap">
      <div class="panel">
        <div class="panel-header">Event Detail</div>

        <div class="event-detail">
          <div class="event-image-card">
            <img :src="event.image" :alt="event.title" />
          </div>

          <div class="event-info">
            <h2>{{ event.title }}</h2>
            <p class="all-ages">All Ages</p>

            <div class="info-row">
              <span class="info-icon">LOC</span>
              <div>
                <strong>{{ event.venue }}</strong>
                <br />
                New York City, NY
              </div>
            </div>

            <div class="info-row">
              <span class="info-icon">DATE</span>
              <div>
                <strong>{{ event.date }}</strong>
                <br />
                Doors open at {{ event.doors }}
              </div>
            </div>
          </div>
        </div>

        <div class="description">
          <p>{{ event.description }}</p>

          <ul>
            <li>General admission access to the selected SeatGate X event.</li>
            <li>Live performance experience at the listed New York City venue.</li>
            <li>Doors open before the scheduled event time shown above.</li>
            <li>Tickets are available in limited quantities and may sell out before checkout.</li>
            <li>Main Tickets are the only ticket type for this event.</li>
            <li>All ticket selections are subject to availability at the time of purchase.</li>
          </ul>
        </div>

        <section class="ticket-section">
          <div class="ticket-header">
            <div>Ticket</div>
            <div>Price</div>
            <div>Quantity</div>
          </div>

          <div
            v-for="ticket in tickets"
            :key="ticket.id"
            class="ticket-row"
            :class="{ muted: ticket.soldOut }"
          >
            <div class="ticket-name">
              {{ ticket.name }}
            </div>

            <div class="ticket-price">
              ${{ ticket.price.toFixed(2) }}
            </div>

            <div class="ticket-quantity">
              <div v-if="ticket.soldOut" class="sold-out">
                Sold Out
              </div>

              <div v-else class="fixed-quantity">
                {{ ticket.quantity }}
              </div>
            </div>
          </div>

          <div class="cart-row">
            <button class="cart-button" :disabled="totalQuantity === 0" @click="addToCart">
              Add to Cart
            </button>
          </div>

          <p v-if="ticketError" class="ticket-error">
            {{ ticketError }}
          </p>
        </section>
      </div>
    </section>

    <section v-else class="missing">
      <h1>Event Not Found</h1>
      <button @click="router.push('/concerts')">Back to Concerts</button>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'

const route = useRoute()
const router = useRouter()

const events = [
  {
    id: 1,
    title: 'SeatGate X Trial',
    image: `${import.meta.env.BASE_URL}seatgate-trial.png`,
    tagline: 'Precision. Timing. Control.',
    date: 'Friday, Apr 25, 2026',
    doors: '1:00 PM',
    venue: 'Audit Control Theatre',
    description:
      'SeatGate X Trial is a ballet performance built around precision, timing, and controlled movement. The event is used in the lab to discuss authorization, sequencing, and evidence trails in a high-volume ticketing system.',
  },
  {
    id: 2,
    title: 'SeatGate X Main',
    image: `${import.meta.env.BASE_URL}seatgate-main.png`,
    tagline: 'Transactions. Evidence. Assurance.',
    date: 'Friday, Apr 25, 2026',
    doors: '2:00 PM',
    venue: 'Revenue Recognition Hall',
    description:
      'SeatGate X Main is the core ticketing exercise where each purchase represents a transaction point: authorization, payment, delivery, refund, and reconciliation.',
  },
]

const event = computed(() => {
  const id = Number(route.params.id)
  return events.find((item) => item.id === id)
})

const tickets = ref([])
const loadingTickets = ref(false)
const ticketError = ref('')

const totalQuantity = computed(() => {
  return tickets.value.reduce((sum, ticket) => sum + ticket.quantity, 0)
})

async function loadTickets() {
  if (!event.value) {
    tickets.value = []
    return
  }

  loadingTickets.value = true
  ticketError.value = ''

  try {
    const API_BASE =
      import.meta.env.VITE_API_BASE_URL || 'https://acc3202-ticketing-bot.onrender.com'

    const response = await fetch(`${API_BASE}/api/events/${route.params.id}/tickets`)
    const data = await response.json()

    if (!response.ok) {
      ticketError.value = data.error || 'Could not load tickets.'
      return
    }

    tickets.value = data.tickets.map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      price: ticket.price,
      quantity: ticket.soldOut ? 0 : 1,
      soldOut: ticket.soldOut,
      availableQuantity: ticket.availableQuantity,
      isReleased: ticket.isReleased,
    }))
  } catch {
    ticketError.value = 'Could not connect to the ticket server.'
  } finally {
    loadingTickets.value = false
  }
}

onMounted(loadTickets)

watch(
  () => route.params.id,
  () => {
    loadTickets()
  }
)

function addToCart() {
  const token = localStorage.getItem('ticketToken')
  const storedUser = localStorage.getItem('ticketUser')

  if (!token || !storedUser) {
    localStorage.removeItem('ticketToken')
    localStorage.removeItem('ticketUser')
    localStorage.removeItem('ticketCart')
    ticketError.value = 'Sign in before adding tickets to your cart.'
    return
  }

  const selectedTickets = tickets.value
    .filter((ticket) => ticket.quantity > 0)
    .map((ticket) => ({
      id: ticket.id,
      ticketTypeId: ticket.id,
      name: ticket.name,
      price: ticket.price,
      quantity: ticket.quantity,
      subtotal: ticket.price * ticket.quantity,
    }))

  const cart = {
    eventId: event.value.id,
    eventTitle: event.value.title,
    eventImage: event.value.image,
    eventDate: event.value.date,
    eventVenue: event.value.venue,
    tickets: selectedTickets,
    total: selectedTickets.reduce((sum, ticket) => sum + ticket.subtotal, 0),
  }

  localStorage.setItem('ticketCart', JSON.stringify(cart))
  router.push('/cart')
}
</script>

<style scoped>
.event-page {
  min-height: 100vh;
  background: #f2f2f2;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}

.event-hero {
  position: relative;
  height: 250px;
  overflow: hidden;
  background: #111;
}

.hero-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(0.95);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.18)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.55));
}

.event-title-block {
  position: absolute;
  left: 54px;
  bottom: 32px;
  color: white;
}

.event-title-block h1 {
  margin: 0;
  font-size: 70px;
  line-height: 0.9;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.event-title-block p {
  margin: 14px 0 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 1px;
}

.detail-wrap {
  max-width: 1050px;
  margin: -28px auto 70px;
  padding: 0 24px;
  position: relative;
  z-index: 2;
}

.panel {
  background: white;
  border-radius: 4px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.panel-header {
  background: #e9e9e9;
  padding: 14px 24px;
  font-size: 20px;
  border-bottom: 1px solid #d4d4d4;
}

.event-detail {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
  padding: 32px 48px 26px;
  align-items: start;
}

.event-image-card {
  width: 280px;
  height: 190px;
  background: #1aa97b;
  overflow: hidden;
}

.event-image-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-info h2 {
  font-size: 26px;
  line-height: 1.1;
  margin: 0 0 8px;
}

.all-ages {
  margin: 0 0 18px;
  font-size: 15px;
}

.info-row {
  display: flex;
  gap: 15px;
  margin: 16px 0;
  font-size: 16px;
  line-height: 1.35;
}

.info-icon {
  color: #0057ff;
  width: 38px;
  font-size: 12px;
  font-weight: 900;
  text-align: center;
}

.description {
  padding: 6px 48px 30px;
  font-size: 15px;
  line-height: 1.45;
}

.description p {
  margin: 0 0 16px;
}

.description ul {
  margin: 0;
  padding-left: 20px;
}

.ticket-section {
  padding: 12px 0 34px;
  border-top: 1px solid #d8d8d8;
}

.ticket-header,
.ticket-row {
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr;
  align-items: center;
}

.ticket-header {
  padding: 10px 32px;
  font-size: 18px;
  border-bottom: 1px solid #cfcfcf;
}

.ticket-row {
  min-height: 86px;
  padding: 0 32px;
  font-size: 17px;
}

.ticket-row:nth-child(odd) {
  background: #ededed;
}

.ticket-row.muted {
  color: #555;
}

.ticket-price {
  font-weight: 500;
}

.ticket-quantity {
  justify-self: end;
}

.fixed-quantity {
  font-size: 20px;
  font-weight: 800;
}

.sold-out {
  background: #444;
  color: white;
  border-radius: 22px;
  padding: 10px 26px;
  font-weight: 800;
}

.cart-row {
  display: flex;
  justify-content: flex-end;
  padding: 20px 16px 0;
}

.ticket-error {
  margin: 14px 32px 0;
  color: #b00020;
  font-size: 15px;
  font-weight: 800;
  text-align: right;
}

.cart-button {
  border: none;
  background: #2c70bd;
  color: white;
  min-width: 210px;
  padding: 16px 28px;
  border-radius: 28px;
  font-size: 17px;
  font-weight: 800;
  cursor: pointer;
}

.cart-button:disabled {
  background: #c7d9eb;
  cursor: not-allowed;
}

.missing {
  min-height: 70vh;
  padding: 80px 40px;
}

.missing button {
  background: #0057ff;
  color: white;
  border: none;
  padding: 14px 24px;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 800px) {
  .event-title-block {
    left: 28px;
  }

  .event-title-block h1 {
    font-size: 44px;
  }

  .event-title-block p {
    font-size: 18px;
  }

  .event-detail {
    grid-template-columns: 1fr;
    padding: 28px;
  }

  .event-image-card {
    width: 100%;
    height: 230px;
  }

  .description {
    padding: 0 28px 28px;
  }

  .ticket-header,
  .ticket-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .ticket-header {
    display: none;
  }

  .ticket-row {
    padding: 20px 28px;
  }

  .ticket-quantity {
    justify-self: start;
  }
}
</style>
