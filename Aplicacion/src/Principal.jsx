import React from 'react'
import { createRoot } from 'react-dom/client'
import { ProveedorSesion } from './Contextos/Sesion'
import { Aplicacion } from './Aplicacion'
import './Estilos/Principal.css'
createRoot(document.getElementById('root')).render(<React.StrictMode><ProveedorSesion><Aplicacion/></ProveedorSesion></React.StrictMode>)