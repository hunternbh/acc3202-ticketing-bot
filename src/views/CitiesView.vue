<template>
  <main class="city-page">
    <SiteHeader :show-title="false" :show-search="false" />

    <section class="city-hero">
      <img src="/nyc.jpg" alt="New York City skyline" class="hero-bg" />
      <div class="hero-shade"></div>

      <div class="city-content">
        <div class="breadcrumb">Home / Cities / New York City</div>

        <h1>NEW YORK CITY</h1>
        <div class="blue-rule"></div>

        <p class="intro">
          Looking for things to do in New York City? Whether you're planning a weekend in the city
          or searching for events happening tonight, NYC offers unforgettable experiences year-round.
          From concerts and live performances to audit-risk testing events, there's something for
          everyone to examine.
        </p>

        <section class="events-section">
          <div class="section-marker"></div>
          <h2>HAPPENING THIS WEEK</h2>

          <div class="event-grid">
            <article
              v-for="event in events"
              :key="event.id"
              class="event-card"
              @click="goToEvent(event.id)"
            >
              <div class="image-wrap">
                <img :src="event.image" :alt="event.title" />
                <span class="today-badge">▣ TODAY</span>
              </div>

              <div class="event-meta">{{ event.date }}</div>
              <h3>{{ event.title }}</h3>
              <div class="venue">{{ event.venue }}</div>
            </article>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
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
  },
  {
    id: 2,
    title: 'SeatGate X Main',
    image: `${import.meta.env.BASE_URL}seatgate-main.png`,
    date: 'Apr 25 · Sat · 2:00 PM',
    venue: 'Revenue Recognition Hall',
  },
  {
    id: 3,
    title: 'SeatGate X Post',
    image: `${import.meta.env.BASE_URL}seatgate-post.png`,
    date: 'Apr 25 · Sat · 3:00 PM',
    venue: 'Bot Detection Center',
  },
]

function goToEvent(id) {
  router.push(`/events/${id}`)
}
</script>

<style scoped>
.city-page {
  min-height: 100vh;
  background: #101010;
  color: white;
  font-family: Arial, Helvetica, sans-serif;
}

.city-hero {
  position: relative;
  min-height: calc(100vh - 136px);
  overflow: hidden;
  background: #101010;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 560px;
  object-fit: cover;
  z-index: 0;
}

.hero-shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.12) 0%,
      rgba(0, 0, 0, 0.48) 38%,
      #101010 72%
    ),
    linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.65) 0%,
      rgba(0, 0, 0, 0.22) 48%,
      rgba(0, 0, 0, 0.55) 100%
    );
  z-index: 1;
}

.city-content {
  position: relative;
  z-index: 2;
  max-width: 1180px;
  margin: 0 auto;
  padding: 95px 24px 80px;
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
  width: 670px;
  max-width: 100%;
  height: 18px;
  background: #0057ff;
  margin: 12px 0 36px;
}

.intro {
  max-width: 790px;
  font-size: 17px;
  line-height: 1.55;
  font-weight: 700;
  color: #f3f3f3;
  margin-bottom: 70px;
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

h2 {
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
}

.image-wrap {
  position: relative;
  height: 124px;
  overflow: hidden;
  border-radius: 2px;
  background: #222;
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* small blue "TODAY" tag */
.today-badge {
  position: absolute;
  left: 8px;
  bottom: 8px;
  background: #0057ff;
  color: white;
  font-size: 12px;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 2px;
}

.event-meta {
  margin-top: 12px;
  font-size: 15px;
  color: #e0e0e0;
  font-weight: 700;
}

.event-card h3 {
  font-size: 16px;
  line-height: 1.35;
  margin: 7px 0 4px;
  font-weight: 900;
  color: white;
}

.venue {
  font-size: 15px;
  color: #d5d5d5;
  line-height: 1.35;
}

.event-card:hover h3 {
  text-decoration: underline;
}

@media (max-width: 1050px) {
  h1 {
    font-size: 58px;
  }

  .event-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .image-wrap {
    height: 180px;
  }
}

@media (max-width: 650px) {
  .city-content {
    padding-top: 70px;
  }

  h1 {
    font-size: 44px;
  }

  .blue-rule {
    height: 12px;
  }

  .event-grid {
    grid-template-columns: 1fr;
  }
}
</style>
