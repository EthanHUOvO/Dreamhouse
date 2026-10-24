import Link from 'next/link'
import BeijingConstructionLogo from '@/components/branding/BeijingConstructionLogo'
export default function PortalHeader({title: _title,subtitle: _subtitle}:{title:string;subtitle:string}){return <header className="portal-header"><Link href="/" className="brand"><span>IDEAL HOME <b>理想家</b></span><small>把家的想法，变成看得见的空间</small></Link><BeijingConstructionLogo /></header>}
