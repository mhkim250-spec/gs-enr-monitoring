type SidebarProps={active?:string};

const items=[
  {key:"summary",icon:"▦",label:"요약",href:"/summary"},
  {key:"assembly",icon:"◫",label:"국회",href:"/#assembly"},
  {key:"korcham",icon:"◇",label:"대한상의",href:"/#korcham"},
  {key:"kweia",icon:"✦",label:"풍력산업협회",href:"/#kweia"},
  {key:"kpx",icon:"⌁",label:"전력거래소",href:"/#kpx"},
  {key:"climateforum",icon:"◉",label:"기후변화포럼",href:"/#climateforum"},
  {key:"pcccr",icon:"◌",label:"기후위기위원회",href:"/#pcccr"},
];

export default function Sidebar({active}:SidebarProps){return <aside className="app-sidebar" aria-label="출처 메뉴"><a className="sidebar-brand" href="/"><img src="/gs-enr-logo.png" alt="GS E&R"/><span>행사 모니터링</span></a><nav>{items.map((item)=><a className={active===item.key?"active":""} href={item.href} key={item.key}><i aria-hidden="true">{item.icon}</i><span>{item.label}</span></a>)}</nav><div className="sidebar-status"><i/>매일 09:00 업데이트</div></aside>}
