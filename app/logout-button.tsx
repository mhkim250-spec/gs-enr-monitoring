"use client";
import { usePathname } from "next/navigation";
export default function LogoutButton(){const pathname=usePathname();const logout=async()=>{await fetch("/api/auth/logout",{method:"POST"});window.location.href="/login";};if(pathname==="/login")return null;return <button className="logout-button" type="button" onClick={()=>void logout()}>로그아웃</button>}
