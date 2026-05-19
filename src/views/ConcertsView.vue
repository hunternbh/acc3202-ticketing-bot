<template>
  <main class="concerts-page">
    <SiteHeader :show-title="false" :show-search="false" />

    <section class="concerts-hero">
      <div class="hero-shade"></div>

      <div class="concerts-content">
        <div class="breadcrumb">Home / Concerts / New York City</div>

        <h1>CONCERTS</h1>
        <div class="blue-rule"></div>

        <p class="intro">
          Explore the SeatGate X event series. Hover over each event to preview the performance,
          then click to open the ticketing page. These events will later become the sandbox
          environment for testing fraud risks, bot behavior, and audit trails.
        </p>

        <section class="feature-panel" @click="goToEvent(activeEvent.id)">
          <div class="feature-image-wrap">
            <img :src="activeEvent.image" :alt="activeEvent.title" />
            <span class="today-badge">▣ TODAY</span>
          </div>

          <div class="feature-text">
            <div class="event-meta">{{ activeEvent.date }}</div>
            <h2>{{ activeEvent.title }}</h2>
            <p>{{ activeEvent.description }}</p>
            <div class="venue">{{ activeEvent.venue }}</div>
            <button>View Event</button>
          </div>
        </section>

        <section class="events-section">
          <div class="section-marker"></div>
          <h2 class="section-title">SEATGATE X EVENTS</h2>

          <div class="event-grid">
            <article
              v-for="event in events"
              :key="event.id"
              class="event-card"
              :class="{ active: event.id === activeEvent.id }"
              @mouseenter="activeEvent = event"
              @focus="activeEvent = event"
              @click="goToEvent(event.id)"
              tabindex="0"
            >
              <div class="image-wrap">
                <img :src="event.image" :alt="event.title" />
              </div>

              <div class="event-meta">{{ event.date }}</div>
              <h3>{{ event.title }}</h3>
              <div class="venue">{{ event.shortVenue }}</div>
            </article>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'

const router = useRouter()

const events = [
  {
    id: 1,
    title: 'SeatGate X Trial',
    image: `${import.meta.env.BASE_URL}seatgate-trial.png`,
    date: 'Apr 25 · Sat · 1:00 PM',
    venue: 'Audit Control Theatre',
    shortVenue: 'Audit Control Theatre',
    description:
      'SeatGate X Trial is a ballet performance built around precision, timing, and controlled movement. In the audit version of the lab, it represents the importance of sequence, authorization, and clean evidence trails in a high-volume ticketing system.',
  },
  {
    id: 2,
    title: 'SeatGate X Main',
    image: `${import.meta.env.BASE_URL}seatgate-main.png`,
    date: 'Apr 25 · Sat · 2:00 PM',
    venue: 'Revenue Recognition Hall',
    shortVenue: 'Revenue Recognition Hall',
    description:
      'SeatGate X Main is the core ticketing exercise where each purchase mirrors a transaction point: authorization, payment, delivery, refund, and reconciliation. Students use this event to test whether the system records transactions accurately.',
  },
  {
    id: 3,
    title: 'SeatGate X Post',
    image: `${import.meta.env.BASE_URL}seatgate-post.png`,
    date: 'Apr 25 · Sat · 3:00 PM',
    venue: 'Bot Detection Center',
    shortVenue: 'Bot Detection Center',
    description:
      'SeatGate X Post closes the exercise with post-event review, focusing on abnormal traffic patterns, repeated requests, reconciliations, and whether the platform can identify bot-like behavior.',
  },
]

const activeEvent = ref(events[0])

function goToEvent(id) {
  router.push(`/events/${id}`)
}
</script>

<style scoped>
.concerts-page {
  min-height: 100vh;
  background: #101010;
  color: white;
  font-family: Arial, Helvetica, sans-serif;
}

.concerts-hero {
  position: relative;
  min-height: calc(100vh - 136px);
  overflow: hidden;
  background: #101010;
}

.hero-shade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 25% 10%, rgba(0, 87, 255, 0.35), transparent 32%),
    linear-gradient(180deg, #1a1a1a 0%, #101010 70%);
  z-index: 0;
}

.concerts-content {
  position: relative;
  z-index: 2;
  max-width: 1180px;
  margin: 0 auto;
  padding: 70px 24px 80px;
}

.breadcrumb {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 18px;
  color: #f1f1f1;
}

h1 {
  font-size: 82px;
  line-height: 0.95;
  margin: 0;
  font-weight: 900;
  letter-spacing: -3px;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.45);
}

.blue-rule {
  width: 520px;
  max-width: 100%;
  height: 18px;
  background: #0057ff;
  margin: 12px 0 34px;
}

.intro {
  max-width: 820px;
  font-size: 17px;
  line-height: 1.55;
  font-weight: 700;
  color: #f3f3f3;
  margin-bottom: 38px;
}

.feature-panel {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 0;
  background: #181818;
  border: 1px solid #2b2b2b;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
  margin-bottom: 54px;
}

.feature-image-wrap {
  position: relative;
  height: 390px;
  background: #222;
}

.feature-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.feature-text {
  padding: 34px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.event-meta {
  font-size: 15px;
  color: #d9d9d9;
  font-weight: 700;
}

.feature-text h2 {
  font-size: 40px;
  line-height: 1.05;
  margin: 12px 0 18px;
  font-weight: 900;
}

.feature-text p {
  font-size: 17px;
  line-height: 1.55;
  color: #e8e8e8;
  margin: 0 0 18px;
}

.venue {
  font-size: 15px;
  color: #d5d5d5;
  font-weight: 700;
}

.feature-text button {
  margin-top: 28px;
  align-self: flex-start;
  background: #0057ff;
  border: none;
  color: white;
  padding: 14px 24px;
  border-radius: 4px;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}

.feature-text button:hover {
  background: #0046cc;
}

.today-badge {
  position: absolute;
  left: 14px;
  bottom: 14px;
  background: #0057ff;
  color: white;
  font-size: 13px;
  font-weight: 900;
  padding: 5px 9px;
  border-radius: 2px;
}

.events-section {
  margin-top: 20px;
}

.section-marker {
  width: 30px;
  height: 5px;
  background: white;
  margin-bottom: 12px;
}

.section-title {
  font-size: 25px;
  margin: 0 0 24px;
  font-weight: 900;
}

.event-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.event-card {
  cursor: pointer;
  min-width: 0;
  opacity: 0.72;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.event-card.active,
.event-card:hover {
  opacity: 1;
  transform: translateY(-3px);
}

.image-wrap {
  position: relative;
  height: 124px;
  overflow: hidden;
  border-radius: 2px;
  background: #222;
  border: 2px solid transparent;
}

.event-card.active .image-wrap {
  border-color: #0057ff;
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-card h3 {
  font-size: 16px;
  line-height: 1.35;
  margin: 7px 0 4px;
  font-weight: 900;
  color: white;
}

.event-card:hover h3 {
  text-decoration: underline;
}

@media (max-width: 1050px) {
  h1 {
    font-size: 58px;
  }

  .feature-panel {
    grid-template-columns: 1fr;
  }

  .event-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .image-wrap {
    height: 180px;
  }
}

@media (max-width: 650px) {
  .concerts-content {
    padding-top: 48px;
  }

  h1 {
    font-size: 44px;
  }

  .blue-rule {
    height: 12px;
  }

  .feature-image-wrap {
    height: 260px;
  }

  .feature-text h2 {
    font-size: 30px;
  }

  .event-grid {
    grid-template-columns: 1fr;
  }
}
</style>
