"use client";

import { useEffect, useState } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [allowed,setAllowed]=useState(false);
  useEffect(()=>{
    if(window.location.pathname==="/login"){setAllowed(true);return;}
    fetch("/api/auth/status",{cache:"no-store"}).then((response)=>{
      if(response.ok) setAllowed(true);
      else window.location.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname+window.location.search)}`);
    }).catch(()=>window.location.replace("/login"));
  },[]);
  return allowed ? children : <main className="auth-loading"><span className="loader"/><p>보안 연결을 확인하고 있습니다.</p></main>;
}
