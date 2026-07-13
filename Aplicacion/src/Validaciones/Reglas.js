export const SoloNumeros=v=>v.replace(/\D/g,'')
export const Limitar=(v,n)=>v.slice(0,n)
export const CorreoValido=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
export const ClaveValida=v=>v.length>=12&&/[A-Z]/.test(v)&&/[a-z]/.test(v)&&/\d/.test(v)&&/[^A-Za-z0-9]/.test(v)