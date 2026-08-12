type SidebarProps={active?:string};

const items=[
  {key:"today",icon:"●",label:"오늘",href:"/"},
  {key:"summary",icon:"▦",label:"주간 일정",href:"/summary"},
  {key:"events",icon:"□",label:"전체 행사",href:"/events"},
  {key:"news",icon:"N",label:"뉴스",href:"/news"},
];

export default function Sidebar({active}:SidebarProps){return <aside className="app-sidebar" aria-label="업무 메뉴"><a className="sidebar-brand" href="/"><img src="/gs-enr-logo.png" alt="GS E&R"/><span>행사 모니터링</span></a><nav>{items.map((item)=><a className={active===item.key?"active":""} href={item.href} key={item.key}><i aria-hidden="true">{item.icon}</i><span>{item.label}</span></a>)}</nav><div className="sidebar-status"><i/>매일 09:00 서버 갱신</div></aside>}
