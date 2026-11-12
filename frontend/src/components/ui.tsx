import type React from 'react';

export function SelectField({label,value,onChange,items}: {label:string;value:any;onChange:(value:string)=>void;items:{value:string|number;label:string}[]}) {
  return <label>{label}<select value={value??''} onChange={e=>onChange(e.target.value)}><option value="">Select...</option>{items.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>;
}

export function Panel({title,children,className}: {title:string;children:React.ReactNode;className?:string}) { return <section className={className}><h3>{title}</h3>{children}</section>; }
export function Table({headers,children}: {headers:string[];children:React.ReactNode}) {
  return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export function Field({name,label,value,onChange,type='text',placeholder='',required=false}: {name:string;label:string;value:any;onChange:(value:string)=>void;type?:string;placeholder?:string;required?:boolean}) {
  return <label>{label}<input name={name} type={type} value={value??''} placeholder={placeholder} required={required} onChange={e=>onChange(e.target.value)}/></label>;
}
