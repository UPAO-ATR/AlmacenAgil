export function Campo({etiqueta,error,className='',...propiedades}) {
  return <label className={`campo ${className}`.trim()}>
    <span>{etiqueta}</span>
    <input {...propiedades}/>
    {error&&<small>{error}</small>}
  </label>
}