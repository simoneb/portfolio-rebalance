import React from 'react'
import ReactDOM from 'react-dom/client'
import { PrimeReactProvider } from 'primereact/api'

import App from './App.jsx'

import 'primeicons/primeicons.css'
import 'primereact/resources/themes/lara-light-cyan/theme.css' //theme
import 'primereact/resources/primereact.min.css' //core css
import '/node_modules/primeflex/primeflex.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrimeReactProvider>
      <App />
    </PrimeReactProvider>
  </React.StrictMode>
)
