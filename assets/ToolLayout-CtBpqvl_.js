var f=Object.defineProperty;var S=(s,a,r)=>a in s?f(s,a,{enumerable:!0,configurable:!0,writable:!0,value:r}):s[a]=r;var u=(s,a,r)=>S(s,typeof a!="symbol"?a+"":a,r);import{c as n,r as d,j as e,m as w,a as N,S as h,b as g,h as C,A as B,n as I,o as H,d as v,T as p,p as E,e as m,l as A,B as j,H as R,R as $,u as D,C as _,L,D as M,q as K,s as T,t as V}from"./index-tGBeXir7.js";import{C as q}from"./circle-alert-9EUqS43p.js";import{S as y,B as x}from"./chunk-LB5SORYD-Dv2Ys2WH.js";import{A as F}from"./arrow-left-B1UhyfVN.js";import{H as O}from"./chunk-A4XRWUAD-DrvjCD-y.js";/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=[["path",{d:"M9 19a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-6a1 1 0 0 1 1-1h3.293a.707.707 0 0 0 .5-1.207l-7.086-7.086a1 1 0 0 0-1.414 0l-7.086 7.086a.707.707 0 0 0 .5 1.207H8a1 1 0 0 1 1 1z",key:"106j91"}]],Y=n("arrow-big-up",U);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]],P=n("arrow-down",G);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]],Z=n("arrow-left",W);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],Q=n("arrow-right",J);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X=[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]],ee=n("arrow-up",X);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const se=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],re=n("chevron-up",se);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=[["path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3",key:"11bfej"}]],te=n("command",ae);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oe=[["path",{d:"M20 4v7a4 4 0 0 1-4 4H4",key:"6o5b7l"}],["path",{d:"m9 10-5 5 5 5",key:"1kshq7"}]],b=n("corner-down-left",oe);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=[["path",{d:"M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z",key:"1yo7s0"}],["path",{d:"m12 9 6 6",key:"anjzzh"}],["path",{d:"m18 9-6 6",key:"1fp51s"}]],ce=n("delete",ne);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const le=[["path",{d:"M3 3h6l6 18h6",key:"ph9rgk"}],["path",{d:"M14 3h7",key:"16f0ms"}]],ie=n("option",le);var de="Kbd_kbdBase__18t3bwt0 layoutStyle_layoutPropsStyle__1kevg3p0 shared_typographyBase__5tv0hj0",he="Kbd_kbdIcon__18t3bwt1",pe={sm:"Kbd_kbdSize_sm__18t3bwt2",md:"Kbd_kbdSize_md__18t3bwt3",lg:"Kbd_kbdSize_lg__18t3bwt4"},k={"⌘":te,"⇧":Y,"⌥":ie,"⌃":re,"⌫":ce,"↵":b,"⏎":b,"↑":ee,"↓":P,"←":Z,"→":Q},me={sm:12,md:14,lg:16};function ue(s,a){if(typeof s!="string")return d.isValidElement(s),s;const r=Array.from(s);return r.some(o=>k[o]!=null)?r.map((o,l)=>{const c=k[o];return c!=null?e.jsx(c,{size:me[a],className:he,"aria-hidden":"true"},l):e.jsx("span",{children:o},l)}):s}var xe=(s,a)=>{const{asChild:r,className:t,style:o,children:l,size:c="md",...i}=s;return e.jsx(w,{ref:a,as:"kbd",asChild:r,className:N(de,pe[c],t),style:o,...i,children:ue(l,c)})},je=d.forwardRef(xe);class ge extends d.Component{constructor(r){super(r);u(this,"handleRetry",()=>{var r,t;this.setState({hasError:!1,error:null,errorInfo:null}),(t=(r=this.props).onRetry)==null||t.call(r)});u(this,"handleNavigateHome",()=>{this.props.onNavigateHome?this.props.onNavigateHome():window.location.href="/"});this.state={hasError:!1,error:null,errorInfo:null}}static getDerivedStateFromError(r){return{hasError:!0,error:r}}componentDidCatch(r,t){this.setState({errorInfo:t}),console.error(`Error in tool ${this.props.toolId}:`,r,t)}render(){if(!this.state.hasError)return this.props.children;const{error:r}=this.state,{toolName:t,toolId:o}=this.props;return e.jsxs(h,{gap:"4",children:[e.jsxs(g,{variant:"outlined",size:"lg",children:[e.jsx(C,{children:e.jsxs(B,{status:"danger",variant:"soft",icon:e.jsx(q,{"aria-hidden":!0}),children:[e.jsxs(I,{children:[t," encountered an error"]}),e.jsx(H,{children:"We hit an unexpected issue while running this tool. You can try again or head back to the dashboard."})]})}),e.jsx(v,{children:e.jsxs(h,{gap:"3",children:[e.jsx(p,{size:"sm",weight:"semibold",children:"Error details"}),e.jsx(g,{variant:"filled",size:"sm",children:e.jsx(v,{children:e.jsx(E,{size:"sm",children:(r==null?void 0:r.message)||"Unknown error occurred"})})}),e.jsxs(m,{gap:"2",align:"center",children:[e.jsx(p,{size:"xs",variant:"caption",children:"Tool ID:"}),e.jsx(je,{size:"sm",children:o})]})]})}),e.jsx(A,{children:e.jsxs(m,{gap:"2",wrap:!0,justify:"end",children:[e.jsx(j,{variant:"soft",colorScheme:"neutral",leftIcon:e.jsx(R,{size:16}),onClick:this.handleNavigateHome,children:"Go to dashboard"}),e.jsxs(j,{variant:"solid",colorScheme:"accent",leftIcon:e.jsx($,{size:16}),onClick:this.handleRetry,children:["Retry ",t]})]})})]}),!1]})}}const ve=({definition:s})=>e.jsx(T,{paddingY:"10",children:e.jsxs(h,{gap:"4",align:"center",children:[e.jsx(V,{size:"xl",colorScheme:"accent",variant:"border"}),e.jsxs(p,{size:"md",weight:"medium",children:["Loading ",s.name,"…"]})]})}),_e=s=>s.version?s.version.includes("beta")||s.version.startsWith("0.")||parseFloat(s.version)<1?{label:"Beta",colorScheme:"warning"}:s.isNew?{label:"New",colorScheme:"success"}:{label:`v${s.version}`,colorScheme:"accent"}:null,Se=({definition:s,ToolComponent:a})=>{const r=D(),[t,o]=d.useState(Date.now()),l=()=>o(Date.now()),c=()=>r("/"),i=_e(s),z=s.icon;return e.jsxs(w,{minHeight:"screen",children:[e.jsx(y,{as:"header",space:"sm",children:e.jsx(_,{size:"xl",children:e.jsxs(h,{gap:"4",children:[e.jsxs(m,{justify:"between",align:"center",gap:"4",wrap:!0,children:[e.jsx(j,{asChild:!0,variant:"ghost",colorScheme:"neutral",size:"sm",shape:"pill",leftIcon:e.jsx(F,{size:16}),"aria-label":"Back to tools",children:e.jsx(L,{to:"/",children:"Back"})}),e.jsxs(m,{align:"center",gap:"3",wrap:!0,children:[e.jsx(z,{size:28,"aria-hidden":!0}),e.jsx(O,{level:1,size:"lg",weight:"bold",children:s.name}),s.category&&e.jsx(x,{variant:"soft",colorScheme:"neutral",size:"sm",shape:"pill",children:s.category}),i&&e.jsx(x,{variant:"soft",colorScheme:i.colorScheme,size:"sm",children:i.label}),!s.enabled&&e.jsx(x,{variant:"outline",colorScheme:"warning",size:"sm",children:"Coming soon"})]})]}),e.jsx(p,{size:"sm",variant:"caption",children:s.description}),e.jsx(M,{})]})})}),e.jsx(y,{as:"main",space:"md",children:e.jsx(_,{size:"xl",children:e.jsx(ge,{toolName:s.name,toolId:s.id,onRetry:l,onNavigateHome:c,children:e.jsx(d.Suspense,{fallback:e.jsx(ve,{definition:s}),children:K.isValidElement(a)?a:e.jsx(a,{definition:s},t)})})})})]})};export{Se as default};
