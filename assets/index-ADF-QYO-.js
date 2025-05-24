import{c as C,r as s,j as n}from"./index-zRRgL-FN.js";import{P as w,u as M,g as T,c as z,d as I,j as D,i as H}from"./index-43wLKzKZ.js";/**
 * @license lucide-react v0.476.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],G=C("CircleCheck",L);/**
 * @license lucide-react v0.476.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],J=C("Circle",A);/**
 * @license lucide-react v0.476.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1",key:"zuxfzm"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1",key:"1okwgv"}]],K=C("Pause",B);var $="Label",y=s.forwardRef((t,c)=>n.jsx(w.label,{...t,ref:c,onMouseDown:e=>{var o;e.target.closest("button, input, select, textarea")||((o=t.onMouseDown)==null||o.call(t,e),!e.defaultPrevented&&e.detail>1&&e.preventDefault())}}));y.displayName=$;var Q=y,x="Switch",[q,V]=z(x),[O,F]=q(x),S=s.forwardRef((t,c)=>{const{__scopeSwitch:e,name:r,checked:o,defaultChecked:l,required:i,disabled:a,value:d="on",onCheckedChange:m,form:b,...h}=t,[u,_]=s.useState(null),E=M(c,f=>_(f)),k=s.useRef(!1),v=u?b||!!u.closest("form"):!0,[p=!1,j]=T({prop:o,defaultProp:l,onChange:m});return n.jsxs(O,{scope:e,checked:p,disabled:a,children:[n.jsx(w.button,{type:"button",role:"switch","aria-checked":p,"aria-required":i,"data-state":R(p),"data-disabled":a?"":void 0,disabled:a,value:d,...h,ref:E,onClick:I(t.onClick,f=>{j(N=>!N),v&&(k.current=f.isPropagationStopped(),k.current||f.stopPropagation())})}),v&&n.jsx(U,{control:u,bubbles:!k.current,name:r,value:d,checked:p,required:i,disabled:a,form:b,style:{transform:"translateX(-100%)"}})]})});S.displayName=x;var P="SwitchThumb",g=s.forwardRef((t,c)=>{const{__scopeSwitch:e,...r}=t,o=F(P,e);return n.jsx(w.span,{"data-state":R(o.checked),"data-disabled":o.disabled?"":void 0,...r,ref:c})});g.displayName=P;var U=t=>{const{control:c,checked:e,bubbles:r=!0,...o}=t,l=s.useRef(null),i=D(e),a=H(c);return s.useEffect(()=>{const d=l.current,m=window.HTMLInputElement.prototype,h=Object.getOwnPropertyDescriptor(m,"checked").set;if(i!==e&&h){const u=new Event("click",{bubbles:r});h.call(d,e),d.dispatchEvent(u)}},[i,e,r]),n.jsx("input",{type:"checkbox","aria-hidden":!0,defaultChecked:e,...o,tabIndex:-1,ref:l,style:{...t.style,...a,position:"absolute",pointerEvents:"none",opacity:0,margin:0}})};function R(t){return t?"checked":"unchecked"}var Y=S,Z=g;export{G as C,K as P,Q as R,Z as T,J as a,Y as b};
