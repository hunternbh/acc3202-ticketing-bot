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
              <span class="info-icon">📍</span>
              <div>
                <strong>{{ event.venue }}</strong>
                <br />
                New York City, NY
              </div>
            </div>

            <div class="info-row">
              <span class="info-icon">📅</span>
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
    <li>General admission access to the selected Hunter X event.</li>
    <li>Live performance experience at the listed New York City venue.</li>
    <li>Doors open before the scheduled event time shown above.</li>
    <li>Tickets are available in limited quantities and may sell out before checkout.</li>
    <li>Early Bird, Pre-General, and General Admission ticket types may be released at different times.</li>
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

              <div v-else class="quantity-control">
                <button @click="decrement(ticket)" :disabled="ticket.quantity === 0">
                  −
                </button>
                <span>{{ ticket.quantity }}</span>
                <button @click="increment(ticket)">
                  +
                </button>
              </div>
            </div>
          </div>

          <div class="cart-row">
            <button class="cart-button" :disabled="totalQuantity === 0" @click="addToCart">
              Add to Cart
            </button>
          </div>
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
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'

const route = useRoute()
const router = useRouter()

const events = [
  {
    id: 1,
    title: 'Hunter X One',
    image: '/hunter-1.png',
    tagline: 'Precision. Timing. Control.',
    date: 'Friday, Apr 25, 2026',
    doors: '1:00 PM',
    venue: 'Audit Control Theatre',
    description:
      'Hunter X One is a ballet performance built around precision, timing, and controlled movement. The event is used in the lab to discuss authorization, sequencing, and evidence trails in a high-volume ticketing system.',
  },
  {
    id: 2,
    title: 'Hunter X Two',
    image: '/hunter-2.png',
    tagline: 'A guided tour through transaction flow.',
    date: 'Friday, Apr 25, 2026',
    doors: '2:00 PM',
    venue: 'Revenue Recognition Hall',
    description:
      'Hunter X Two is a food tour through a fast-moving marketplace. Each stop represents a transaction point: purchase, payment, delivery, refund, and reconciliation.',
  },
  {
    id: 3,
    title: 'Hunter X Three',
    image: '/hunter-3.png',
    tagline: 'Rhythm. Repetition. Detection.',
    date: 'Friday, Apr 25, 2026',
    doors: '3:00 PM',
    venue: 'Bot Detection Center',
    description:
      'Hunter X Three is a Chinese traditional lion dance performance. It is used to frame abnormal traffic patterns, repeated requests, and bot-detection controls.',
  },
  {
    id: 4,
    title: 'Hunter X Four',
    image: '/hunter-4.png',
    tagline: 'One carousel. Many transaction cycles.',
    date: 'Friday, Apr 25, 2026',
    doors: '4:00 PM',
    venue: 'Central Park Carousel',
    description:
      'Hunter X Four is a carousel ride in Central Park. Its repeated cycles mirror ticket sale, transfer, refund, and resale activity.',
  },
  {
    id: 5,
    title: 'Hunter X Five',
    image: '/hunter-5.png',
    tagline: 'A classroom simulation of fraud testing.',
    date: 'Friday, Apr 25, 2026',
    doors: '5:00 PM',
    venue: 'ACC3202 Classroom Simulation',
    description:
      'Hunter X Five is a classroom simulation where students act as auditors of a ticketing platform. The exercise focuses on fraud testing, internal controls, audit logs, and automated scripts.',
  },
]

const event = computed(() => {
  const id = Number(route.params.id)
  return events.find((item) => item.id === id)
})

const tickets = reactive([
  {
    id: 1,
    name: 'Early Bird Ticket',
    price: 1,
    quantity: 0,
    soldOut: true,
  },
  {
    id: 2,
    name: 'Pre-General Ticket',
    price: 2,
    quantity: 0,
    soldOut: false,
  },
  {
    id: 3,
    name: 'General Admission Ticket',
    price: 3,
    quantity: 0,
    soldOut: false,
  },
])

const totalQuantity = computed(() => {
  return tickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
})

function increment(ticket) {
  ticket.quantity += 1
}

function decrement(ticket) {
  if (ticket.quantity > 0) {
    ticket.quantity -= 1
  }
}

function addToCart() {
  const selectedTickets = tickets
    .filter((ticket) => ticket.quantity > 0)
    .map((ticket) => ({
      id: ticket.id,
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

/* reset quantities when switching from /events/1 to /events/2 */
watch(
  () => route.params.id,
  () => {
    tickets.forEach((ticket) => {
      ticket.quantity = 0
    })
  }
)
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
  letter-spacing: -2px;
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
  font-size: 28px;
  color: #0057ff;
  width: 30px;
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

.quantity-control {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 20px;
}

.quantity-control button {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: none;
  background: #e3e3e3;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.quantity-control button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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