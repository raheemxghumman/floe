import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'

const App = lazy(() => import('./App'))
const Landing = lazy(() => import('./landing/Landing'))
const Admin = lazy(() => import('./admin/Admin'))

const path = window.location.pathname
const route = path.startsWith('/admin') ? 'admin' : path.startsWith('/app') ? 'app' : 'landing'
document.documentElement.dataset.route = route

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="boot" />}>
      {route === 'admin' ? <Admin /> : route === 'app' ? <App /> : <Landing />}
    </Suspense>
  </StrictMode>,
)
