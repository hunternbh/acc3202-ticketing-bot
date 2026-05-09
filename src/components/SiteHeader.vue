<template>
  <header>
    <div class="utility-bar">
      <div>🇺🇸 US</div>
      <div class="utility-right">
        <span>Help</span>
      </div>
    </div>

    <div class="main-header">
      <div class="nav-row">
        <RouterLink to="/" class="brand">SeatGate</RouterLink>

        <nav class="nav-links">
          <RouterLink to="/concerts">Concerts</RouterLink>
          <RouterLink to="/cities">Cities</RouterLink>
        </nav>

        <div v-if="currentUser" class="user-box">
          <RouterLink to="/my-account" class="account-link">
            {{ currentUser.email }}
          </RouterLink>

          <RouterLink to="/my-account" class="wallet">
            Wallet: ${{ currentUser.walletBalance.toFixed(2) }}
          </RouterLink>

          <button @click="logout">Log Out</button>
        </div>

        <button v-else class="signin" @click="showLogin = true">
          Sign In/Register
        </button>
      </div>

      <h1 v-if="showTitle" class="course-title">
        ACC3202 Ticketing Bot Practice
      </h1>

      <section v-if="showSearch" class="search-card">
        <div class="search-item">
          <div class="icon">⌖</div>
          <div>
            <label>LOCATION</label>
            <div class="fixed-location">NYC</div>
          </div>
        </div>

        <div class="search-item">
          <div class="icon">📅</div>
          <div>
            <label>DATES</label>
            <select v-model="selectedDate">
            <option value="1">Apr 25 1pm</option>
            <option value="2">Apr 25 2pm</option>
            <option value="3">Apr 25 3pm</option>
            <option value="4">Apr 25 4pm</option>
            <option value="5">Apr 25 5pm</option>
          </select>
          </div>
        </div>

        <div class="search-item search-input-wrap">
          <div class="icon">⌕</div>
          <div>
            <label>SEARCH</label>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Artist, Event or Venue"
              @input="showSearchTip = true"
            />

            <div v-if="showSearchTip" class="search-tip">
              Only SeatGate is allowed.
            </div>
          </div>
        </div>

        <button class="search-button" @click="runSearch">Search</button>
      </section>
    </div>

    <LoginModal
      v-if="showLogin"
      @close="showLogin = false"
      @login-success="setCurrentUser"
    />
  </header>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import LoginModal from './LoginModal.vue'

defineProps({
  showTitle: {
    type: Boolean,
    default: true,
  },
  showSearch: {
    type: Boolean,
    default: true,
  },
})

const router = useRouter()

const selectedDate = ref('1')
const searchTerm = ref('')
const showSearchTip = ref(false)
const showLogin = ref(false)
const currentUser = ref(null)

onMounted(() => {
  const storedUser = localStorage.getItem('ticketUser')
  if (storedUser) {
    currentUser.value = JSON.parse(storedUser)
  }
})

function setCurrentUser(user) {
  currentUser.value = user
}

function logout() {
  localStorage.removeItem('ticketUser')
  currentUser.value = null
}

function runSearch() {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  if (normalizedSearch && normalizedSearch !== 'seatgate') {
    showSearchTip.value = true
    router.push('/concerts')
    return
  }

  router.push(`/events/${selectedDate.value}`)
}
</script>

<style scoped>
.utility-bar {
  height: 46px;
  background: #111;
  color: #f2f2f2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  font-size: 16px;
  font-weight: 600;
}

.utility-right {
  display: flex;
  gap: 28px;
}

.main-header {
  background: #0057ff;
  padding: 30px 28px 58px;
}

.nav-row {
  display: flex;
  align-items: center;
  gap: 32px;
}

.brand {
  font-size: 34px;
  font-weight: 800;
  font-style: italic;
  white-space: nowrap;
  color: white;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 26px;
  font-size: 20px;
  font-weight: 700;
  flex: 1;
}

.nav-links a {
  color: white;
  text-decoration: none;
}

.nav-links a.router-link-active {
  text-decoration: underline;
}

.signin {
  color: white;
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.user-box {
  color: white;
  display: flex;
  align-items: center;
  gap: 14px;
  white-space: nowrap;
}

.user-email {
  font-size: 15px;
  font-weight: 800;
}

.wallet {
  background: rgba(255, 255, 255, 0.16);
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 900;
}

.user-box button {
  border: none;
  background: white;
  color: #0057ff;
  padding: 8px 13px;
  border-radius: 999px;
  font-weight: 900;
  cursor: pointer;
}

.course-title {
  margin: 28px auto 24px;
  text-align: center;
  font-size: 30px;
  font-weight: 800;
  color: white;
}

.search-card {
  max-width: 1220px;
  height: 76px;
  background: white;
  color: #111;
  border-radius: 6px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 290px 290px 1fr 120px;
  overflow: hidden;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  border-right: 1px solid #ddd;
}

.search-input-wrap {
  position: relative;
}

.search-tip {
  position: absolute;
  left: 24px;
  bottom: -28px;
  background: #111;
  color: white;
  font-size: 13px;
  font-weight: 800;
  padding: 6px 10px;
  border-radius: 4px;
  z-index: 10;
  white-space: nowrap;
}

.icon {
  color: #0057ff;
  font-size: 28px;
}

label {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: #1f1f1f;
  margin-bottom: 5px;
}

.fixed-location {
  font-size: 20px;
  color: #555;
}

select,
input {
  border: none;
  outline: none;
  font-size: 20px;
  color: #555;
  width: 100%;
  background: transparent;
}

.search-button {
  margin: 10px;
  border: none;
  background: #0057ff;
  color: white;
  font-size: 20px;
  font-weight: 800;
  border-radius: 5px;
  cursor: pointer;
}

.search-button:hover {
  background: #0046cc;
}

@media (max-width: 1000px) {
  .main-header {
    padding: 22px 18px 36px;
  }

  .nav-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
    align-items: start;
  }

  .brand {
    font-size: 30px;
  }

  .nav-links {
    display: flex;
    gap: 18px;
    font-size: 18px;
    flex-wrap: wrap;
  }

  .signin {
    font-size: 17px;
    text-align: left;
    padding: 0;
  }

  .user-box {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .course-title {
    font-size: 24px;
    margin: 24px auto 20px;
  }

  .search-card {
    grid-template-columns: 1fr;
    height: auto;
  }

  .search-item {
    height: 72px;
    border-right: none;
    border-bottom: 1px solid #ddd;
  }

  .search-button {
    height: 58px;
  }
}


@media (max-width: 520px) {
  .utility-bar {
    height: 40px;
    padding: 0 16px;
    font-size: 14px;
  }

  .main-header {
    padding: 18px 16px 30px;
  }

  .brand {
    font-size: 26px;
  }

  .nav-links {
    gap: 14px;
    font-size: 16px;
  }

  .user-email,
  .account-link {
    font-size: 13px;
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  .wallet {
    font-size: 13px;
  }
}

.account-link {
  color: white;
  font-size: 15px;
  font-weight: 800;
  text-decoration: none;
}

.account-link:hover {
  text-decoration: underline;
}

.wallet {
  color: white;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.16);
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 900;
}

</style>