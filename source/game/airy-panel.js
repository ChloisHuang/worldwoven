// Shared compact modal anatomy. Panels keep their own content and actions.
// Each consumer may append this sheet again. Keep width/overflow fallbacks below
// panel-local selectors so a later copy cannot replace its footer or scroll owner.
export const AIRY_PANEL_STYLE=`
.ww-airy-panel{overflow:hidden;max-height:calc(100dvh - 24px)}.ww-airy-panel[open]{display:flex;flex-direction:column}.ww-airy-panel-heading{flex:0 0 auto;padding-right:28px;margin-bottom:10px}.ww-airy-panel-heading h2{margin:0 0 4px}.ww-airy-panel-heading p{margin:0;font-size:11px;color:#789197}.ww-airy-panel-body{min-height:0;overscroll-behavior:contain;flex:1 1 auto}:where(.ww-airy-panel-body){overflow:auto}.ww-airy-panel-actions{flex:0 0 auto;margin-top:10px}.ww-airy-panel-actions:empty{display:none}.ww-airy-panel-actions :where(button){width:100%}@media(max-height:500px){.ww-airy-panel-heading{margin-bottom:8px}.ww-airy-panel-heading h2{font-size:18px}.ww-airy-panel-actions{margin-top:6px}}
`;
export function createAiryPanelParts(doc){
 const make=(tag,className)=>{const element=doc.createElement(tag);element.className=className;return element;};
 return {header:make('header','ww-airy-panel-heading'),body:make('div','ww-airy-panel-body'),actions:make('footer','ww-airy-panel-actions')};
}
