/** Keep keyboard navigation inside a presented modal and restore the caller. */
export function modalFocus(element:HTMLDialogElement,close:()=>void){
  const previous=document.activeElement as HTMLElement|null;
  const focusable=()=>[...element.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex="0"]')].filter(e=>e.getClientRects().length);
  queueMicrotask(()=>focusable()[0]?.focus());
  function keyboard(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
    if(event.key==='Tab'){const items=focusable(),first=items[0],last=items.at(-1);if(!first)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  }
  element.addEventListener('keydown',keyboard);
  return {destroy(){element.removeEventListener('keydown',keyboard);if(previous?.isConnected)previous.focus();}};
}
