import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TicketsView from '../views/TicketsView.vue'
import CitiesView from '../views/CitiesView.vue'
import ConcertsView from '../views/ConcertsView.vue'
import EventView from '../views/EventView.vue'
import CartView from '../views/CartView.vue'
import PurchaseSuccessView from '../views/PurchaseSuccessView.vue'
import PurchaseFailureView from '../views/PurchaseFailureView.vue'
import MyAccountView from '../views/MyAccountView.vue'
import AdminHoldingsView from '../views/AdminHoldingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/concerts',
      name: 'concerts',
      component: ConcertsView,
    },
    {
      path: '/cities',
      name: 'cities',
      component: CitiesView,
    },
    {
      path: '/tickets',
      name: 'tickets',
      component: TicketsView,
    },
    {
      path: '/events/:id',
      name: 'event',
      component: EventView,
    },
    {
      path: '/admin/holdings',
      name: 'admin-holdings',
      component: AdminHoldingsView,
    },
    {
      path: '/cart',
      name: 'cart',
      component: CartView,
    },
    {
      path: '/purchase/success',
      name: 'purchase-success',
      component: PurchaseSuccessView,
    },
    {
      path: '/purchase/failure',
      name: 'purchase-failure',
      component: PurchaseFailureView,
    },
    {
      path: '/my-account',
      name: 'my-account',
      component: MyAccountView,
    },
  ],
})

export default router