"use client";

import { FormEvent, useState } from "react";

export default function LoginPage(){
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const submit=async(event:FormEvent)=>{
    event.preventDefault(); setError(""); setSubmitting(true);
    const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
    if(response.ok){const params=new URLSearchParams(window.location.search);const target=params.get("returnTo");window.location.replace(target?.startsWith("/")?target:"/");return;}
    const data=await response.json().catch(()=>({})); setError(data.error||"로그인에 실패했습니다."); setSubmitting(false);
  };
  return <main className="login-page">
    <section className="login-card" aria-labelledby="login-title">
      <img className="login-logo" src="/gs-enr-login-logo.png" alt="GS E&R"/>
      <div className="login-label">PUBLIC AFFAIRS MONITOR</div>
      <h1 id="login-title">대외협력 행사 모니터링</h1>
      <p>에너지·기후·산업 관련 주요 행사와 정책 일정을 확인하세요.</p>
      <form onSubmit={submit}>
        <label htmlFor="password">비밀번호</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="비밀번호" required autoFocus/>
        {error&&<p className="login-error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting?"확인 중…":"로그인"}<span>→</span></button>
      </form>
      <small>GS E&R · External Relations Intelligence</small>
    </section>
    <aside className="login-scene-copy"><span>GS E&amp;R</span><strong>Share Value,<br/>Share Energy</strong></aside>
  </main>;
}
