import { parentPort, workerData } from 'node:worker_threads';
import { dirname, join } from 'node:path';
async function extract(){
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const resources=dirname(require.resolve('pdfjs-dist/package.json'));
  const resourcePath=(name:string)=>join(resources,name).replaceAll('\\','/')+'/';
  const task=pdfjs.getDocument({data:new Uint8Array(workerData.bytes),useWorkerFetch:false,disableFontFace:true,stopAtErrors:true,standardFontDataUrl:resourcePath('standard_fonts'),cMapUrl:resourcePath('cmaps'),cMapPacked:true,wasmUrl:resourcePath('wasm')});
  const pdf=await task.promise;
  try{
    if(pdf.numPages>100)throw new Error('PDF exceeds the 100-page import limit.');
    if(workerData.preview){
      const pageNumber=Math.min(pdf.numPages,Math.max(1,workerData.page??1)),page=await pdf.getPage(pageNumber);
      const original=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(1600/original.width,2000/original.height,2)});
      const {createCanvas}=await import('@napi-rs/canvas');const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
      await page.render({canvas:canvas as unknown as HTMLCanvasElement,viewport}).promise;
      parentPort!.postMessage({data:`data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`,page:pageNumber,pageCount:pdf.numPages});return;
    }
    const pages:{page:number;characters:number}[]=[],texts:string[]=[];let total=0;
    for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
      const page=await pdf.getPage(pageNo),result=await page.getTextContent();
      const text=result.items.map(item=>'str'in item?item.str+('hasEOL'in item&&item.hasEOL?'\n':' '):'').join('');
      total+=Buffer.byteLength(text);if(total>25*1024*1024)throw new Error('Extracted text exceeds the 25 MiB preparation limit.');
      texts.push(`[Page ${pageNo}]\n${text}`);pages.push({page:pageNo,characters:text.trim().length});page.cleanup();
    }
    parentPort!.postMessage({text:texts.join('\n\n'),pages,parser:`PDF.js ${pdfjs.version}`,blank:pages.every(p=>p.characters===0)});
  }finally{await task.destroy();}
}
extract().catch(error=>parentPort!.postMessage({error:error instanceof Error?error.message:'PDF preparation failed.'}));
