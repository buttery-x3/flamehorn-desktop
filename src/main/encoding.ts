import type { LibraryState, Profile, Recipe } from '../core/types';
export function prepareRequest(profile:Profile,recipe:Recipe,state:LibraryState,bytes:(id:string)=>Buffer){
  const wire=JSON.stringify(encode(profile,recipe,state,bytes));
  if(profile.capabilities.requestBytes&&Buffer.byteLength(wire)>profile.capabilities.requestBytes)throw new Error('Encoded request exceeds the configured byte limit.');
  // Without a route-specific tokenizer, UTF-8 byte count is a conservative text
  // allowance. Multimodal overhead stays explicitly unknown in the preview.
  let tokens=Buffer.byteLength(recipe.instructions)+128*(recipe.manifest.length+1);
  for(const m of recipe.manifest){const c=state.contents[m.contentId];tokens+=Buffer.byteLength(c.text);for(const id of c.attachments){const rep=state.representations[id];if(rep.text!==undefined)tokens+=Buffer.byteLength(rep.text)+256;}}
  if(profile.capabilities.contextTokens&&tokens+(profile.capabilities.outputTokens??4096)>profile.capabilities.contextTokens)throw new Error('Conservative text allowance plus generation headroom exceeds the configured context limit.');
  return wire;
}
export function encode(profile:Profile,recipe:Recipe,state:LibraryState,bytes:(id:string)=>Buffer) {
  const messages=recipe.manifest.map(m=>{
    const c=state.contents[m.contentId];if(!c)throw new Error('Recorded input material is unavailable.');
    const parts:Record<string,unknown>[]=[];
    const textType=profile.mode==='chat'?'text':m.role==='assistant'?'output_text':'input_text';
    if(c.text)parts.push({type:textType,text:c.text});
    for(const repId of c.attachments){
      const rep=state.representations[repId],asset=rep&&state.assets[rep.assetId];if(!rep||!asset)throw new Error('Recorded attachment is unavailable.');
      if(rep.mode==='text'||rep.mode==='pdf-text')parts.push({type:textType,text:`[${rep.mode==='pdf-text'?'Text extracted from PDF':'Imported text'}: ${asset.name}]\n${rep.text??''}`});
      else {const data=`data:${asset.mime};base64,${bytes(asset.id).toString('base64')}`;
        if(rep.mode==='image')parts.push(profile.mode==='chat'?{type:'image_url',image_url:{url:data}}:{type:'input_image',image_url:data});
        else if(profile.mode==='responses')parts.push({type:'input_file',filename:asset.name,file_data:data});
        else parts.push({type:'file',file:{filename:asset.name,file_data:data}});
      }
    }
    return {role:m.role,content:parts};
  });
  const body:Record<string,unknown>=profile.mode==='responses'?{model:recipe.model,instructions:recipe.instructions,input:messages,store:false,stream:true}:{model:recipe.model,messages:[{role:'system',content:recipe.instructions},...messages],stream:true};
  if(profile.kind!=='chatgpt'&&profile.capabilities.outputCap&&recipe.settings.outputTokens)body[profile.mode==='responses'?'max_output_tokens':'max_tokens']=recipe.settings.outputTokens;
  if(recipe.settings.reasoning)body[profile.mode==='responses'?'reasoning':'reasoning_effort']=profile.mode==='responses'?{effort:recipe.settings.reasoning}:recipe.settings.reasoning;
  return body;
}
