import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ThemeProvider } from './hooks/use-theme'
import DashboardPage from './components/dashboard/DashboardPage'
import { TransactionListPage } from './components/transactions/TransactionListPage'
import { TransactionForm } from './components/transactions/TransactionForm'
import { PaymentMethodListPage } from './components/payment-methods/PaymentMethodListPage'
import { PaymentMethodForm } from './components/payment-methods/PaymentMethodForm'
import { TagListPage } from './components/tags/TagListPage'
import { TagForm } from './components/tags/TagForm'
import { BillsListPage } from './components/bills/BillsListPage'
import { BillForm } from './components/bills/BillForm'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="transactions" element={<TransactionListPage />} />
            <Route path="transactions/new" element={<TransactionForm />} />
            <Route path="transactions/:id/edit" element={<TransactionForm />} />
            <Route path="payment-methods" element={<PaymentMethodListPage />} />
            <Route path="payment-methods/new" element={<PaymentMethodForm />} />
            <Route path="payment-methods/:id/edit" element={<PaymentMethodForm />} />
            <Route path="tags" element={<TagListPage />} />
            <Route path="tags/new" element={<TagForm />} />
            <Route path="tags/:id/edit" element={<TagForm />} />
            <Route path="contas-a-pagar" element={<BillsListPage />} />
            <Route path="contas-a-pagar/nova" element={<BillForm />} />
            <Route path="contas-a-pagar/:id/editar" element={<BillForm />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
