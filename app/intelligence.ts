export const MONITOR_KEYWORDS=["탄소","에너지","ndc","배출권","ppa","분산에너지 특구","원전","석탄","전력","lng","수소","전기","전기요금","smp","rec","열병합","송전","배전","계통","ess","출력제어","열요금","데이터센터","re100","에너지 고속도로","온실가스","신재생","자본시장","금융투자","자본","산업안전","탄소중립","전력망","공시","지속가능","집단에너지","분산에너지","열","소방","산업","재해"];

const priority:Record<string,number>={전력:12,에너지:10,lng:12,집단에너지:14,열:8,ppa:11,smp:11,rec:9,전력망:11,계통:10,분산에너지:10,탄소:8,배출권:9,산업안전:9};

export function classifyText(...parts:string[]){
  const text=parts.join(" ").toLocaleLowerCase("ko");
  const topics=MONITOR_KEYWORDS.filter((keyword)=>text.includes(keyword.toLocaleLowerCase("ko"))).slice(0,5);
  const raw=topics.reduce((score,topic)=>score+(priority[topic.toLocaleLowerCase("ko")]||6),0);
  const score=Math.min(99,Math.max(topics.length?55:28,42+raw));
  return {topics:topics.length?topics:["산업"],score,importance:score>=82?"핵심":score>=65?"관심":"참고"};
}

export function parseDate(value:string){
  const match=value.match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
  return match?new Date(Number(match[1]),Number(match[2])-1,Number(match[3])):null;
}
