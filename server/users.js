export const seedUsers = [
  { email: 'fakebuyer', password: 'password', walletBalance: 79, isAdmin: false },
  { email: 'admin', password: 'adminpass2', walletBalance: 5, isAdmin: true },
  ...Array.from({ length: 50 }, (_, index) => {
    const username = `student${index + 1}`

    return {
      email: username,
      password: username,
      walletBalance: 3,
      isAdmin: false,
    }
  }),
]
