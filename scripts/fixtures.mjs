export function pdf(text,pages=1){
  const stream=`BT /F1 16 Tf 30 80 Td (${text}) Tj ET`;
  const objects=[`<< /Type /Catalog /Pages 2 0 R >>`,`<< /Type /Pages /Kids [${Array.from({length:pages},(_,i)=>`${5+i} 0 R`).join(' ')}] /Count ${pages} >>`,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,...Array.from({length:pages},()=>`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 120] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>`)];
  let value='%PDF-1.4\n';const offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(value));value+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const xref=Buffer.byteLength(value);value+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${n.toString().padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(value);
}
