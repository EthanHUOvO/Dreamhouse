import Link from 'next/link'
export default function PortalHeader({title,subtitle}:{title:string;subtitle:string}){
  return <header className="portal-header"><Link href="/" className="brand-link"><div className="brand">IDEAL HOME <b>理想家</b></div><div className="brand-sub">{subtitle}</div></Link><div className="header-title">{title}</div></header>
}
