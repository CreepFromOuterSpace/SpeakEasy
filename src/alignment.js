// Word alignment compares recognizer output, not clinical pronunciation accuracy.
export function normalize(word) { return word.toLowerCase().normalize('NFKC').replace(/[’']/g, '').replace(/[^\p{L}\p{N}]/gu, ''); }
export function compareText(reference, transcript) {
 const expected=reference.split(/\s+/).filter(Boolean), heard=transcript.split(/\s+/).filter(Boolean);
 const a=expected.map(normalize), b=heard.map(normalize), n=a.length,m=b.length;
 const weight=n+m+1;
 const dp=Array.from({length:n+1},()=>new Int32Array(m+1));
 for(let i=0;i<=n;i++)dp[i][0]=i*weight;for(let j=0;j<=m;j++)dp[0][j]=j*weight;
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i][j]=Math.min(dp[i-1][j]+weight,dp[i][j-1]+weight,dp[i-1][j-1]+(a[i-1]===b[j-1]?-1:weight));
 let i=n,j=m;const items=[];let substitutions=0, omissions=0, additions=0,matches=0;
 while(i||j){
 if(i&&j&&dp[i][j]===dp[i-1][j-1]+(a[i-1]===b[j-1]?-1:weight)){const match=a[i-1]===b[j-1];items.push({word:expected[i-1],heard:heard[j-1],type:match?'match':'substitution',index:i-1});match?matches++:substitutions++;i--;j--;}
 else if(i&&dp[i][j]===dp[i-1][j]+weight){items.push({word:expected[i-1],type:'omission',index:i-1});omissions++;i--;}
 else {items.push({heard:heard[j-1],type:'addition',index:i});additions++;j--;}
 }
 return {items:items.reverse(),matches,substitutions,omissions,additions,expected:n,heard:m,wordErrorRate:n?(substitutions+omissions+additions)/n:0};
}
export function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
