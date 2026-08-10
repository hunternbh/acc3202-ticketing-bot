<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal-card">
      <button class="close-button" @click="$emit('close')">×</button>

      <h1>Sign In</h1>
      <p class="subtitle">
        Use the username and password assigned by the instructor.
      </p>

      <form @submit.prevent="handleLogin">
        <label>Username</label>
        <input
          v-model="email"
          type="text"
          placeholder="student01"
          autocomplete="username"
        />

        <label>Password</label>
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
        />

        <p v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </p>

        <button class="login-button" type="submit">
          Sign In
        </button>
      </form>

      <div class="note">
        Each valid account starts with a $5 wallet balance. The balance cannot be reset by students.
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'login-success'])

const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function readJsonResponse(response) {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

async function handleLogin() {
  errorMessage.value = ''

  try {
    const API_BASE =
      import.meta.env.VITE_API_BASE_URL || 'https://acc3202-ticketing-bot.onrender.com'

    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value,
      }),
    })

    const data = await readJsonResponse(response)

    if (!response.ok) {
      errorMessage.value = data.error || `Login server returned ${response.status}.`
      return
    }

    localStorage.setItem('ticketToken', data.token)
    localStorage.setItem('ticketUser', JSON.stringify(data.user))

    emit('login-success', data.user)
    emit('close')
  } catch (error) {
    errorMessage.value = 'Could not connect to the login server.'
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
}

.modal-card {
  position: relative;
  width: 100%;
  max-width: 430px;
  background: white;
  color: #111;
  border-radius: 8px;
  padding: 34px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  font-family: Arial, Helvetica, sans-serif;
}

.close-button {
  position: absolute;
  top: 14px;
  right: 16px;
  border: none;
  background: transparent;
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
  color: #333;
}

h1 {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 900;
}

.subtitle {
  margin: 0 0 26px;
  color: #555;
  line-height: 1.4;
}

form {
  display: flex;
  flex-direction: column;
}

label {
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
  margin-bottom: 8px;
  color: #333;
}

input {
  height: 48px;
  border: 1px solid #cfcfcf;
  border-radius: 4px;
  padding: 0 13px;
  font-size: 16px;
  margin-bottom: 18px;
}

input:focus {
  outline: 2px solid #0057ff;
  border-color: #0057ff;
}

.error-message {
  margin: -4px 0 16px;
  color: #b00020;
  font-weight: 800;
}

.login-button {
  height: 50px;
  border: none;
  border-radius: 25px;
  background: #0057ff;
  color: white;
  font-size: 17px;
  font-weight: 900;
  cursor: pointer;
}

.login-button:hover {
  background: #0046cc;
}

.note {
  margin-top: 22px;
  padding: 14px 16px;
  background: #f6f8fb;
  border-left: 5px solid #0057ff;
  color: #333;
  line-height: 1.4;
  font-size: 14px;
}
</style>
