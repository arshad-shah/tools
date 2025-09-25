import{c as m,r as n,j as t,L as o}from"./index-DZdnLeNc.js";import{A as x}from"./arrow-left-BZczJyWn.js";import{H as d}from"./house-CBC4fZgR.js";/**
 * @license lucide-react v0.476.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z",key:"9ktpf1"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],p=m("Compass",c),g=()=>{const[e,l]=n.useState({x:0,y:0}),[s,i]=n.useState(5);return n.useEffect(()=>{const r=a=>{l({x:a.clientX/window.innerWidth-.5,y:a.clientY/window.innerHeight-.5})};return window.addEventListener("mousemove",r),()=>{window.removeEventListener("mousemove",r)}},[]),n.useEffect(()=>{if(s<=0)return;const r=setTimeout(()=>{i(s-1)},1e3);return()=>clearTimeout(r)},[s]),t.jsxs("div",{className:"relative h-screen w-full overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900",children:[t.jsxs("div",{className:"absolute inset-0 overflow-hidden",children:[t.jsx("div",{className:"absolute rounded-full bg-purple-600 opacity-20 blur-3xl",style:{width:"60vw",height:"60vw",top:"40%",left:"50%",transform:`translate(-50%, -50%) translate(${e.x*-50}px, ${e.y*-50}px)`,transition:"transform 0.2s ease-out"}}),t.jsx("div",{className:"absolute inset-0 opacity-10",style:{backgroundImage:"linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",backgroundSize:"40px 40px",backgroundPosition:`${e.x*20}px ${e.y*20}px`,transition:"background-position 0.2s ease-out"}}),[...Array(6)].map((r,a)=>t.jsx("div",{className:"absolute rounded-full",style:{width:`${Math.random()*200+50}px`,height:`${Math.random()*200+50}px`,top:`${Math.random()*100}%`,left:`${Math.random()*100}%`,background:`rgba(${Math.random()*100+100}, ${Math.random()*50}, ${Math.random()*150+100}, 0.3)`,filter:"blur(60px)",transform:`translate(${e.x*(a+1)*-15}px, ${e.y*(a+1)*-15}px)`,transition:"transform 0.2s ease-out",animation:`float-${a} ${Math.random()*10+20}s ease-in-out infinite`}},a))]}),t.jsxs("div",{className:"relative z-10 flex h-full flex-col items-center justify-center px-4 text-center",children:[t.jsxs("div",{className:"relative mb-4 text-[10rem] font-bold leading-none tracking-tighter text-white sm:text-[12rem] md:text-[16rem]",style:{textShadow:"0 0 40px rgba(139, 92, 246, 0.8)",transform:`translate(${e.x*20}px, ${e.y*20}px)`,transition:"transform 0.2s ease-out"},children:["404",t.jsx("div",{className:"absolute inset-0 opacity-50 blur-xl",style:{color:"transparent",backgroundImage:"linear-gradient(to bottom right, #8b5cf6, #ec4899)",backgroundClip:"text",WebkitBackgroundClip:"text",transform:`translate(${e.x*-30}px, ${e.y*-30}px)`,transition:"transform 0.2s ease-out"},children:"404"})]}),t.jsxs("div",{className:"mb-6 text-2xl font-medium text-white md:text-4xl",style:{transform:`translate(${e.x*10}px, ${e.y*10}px)`,transition:"transform 0.2s ease-out"},children:[t.jsx("span",{className:"text-pink-400",children:"Houston"}),", we have a problem"]}),t.jsxs("div",{className:"mb-12 max-w-md text-gray-300",children:[t.jsx("p",{children:"The tool you're looking for has vanished into the digital void."}),t.jsx("p",{children:"Perhaps it was never there, or perhaps it's just hiding really well."})]}),t.jsxs("div",{className:"flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0",children:[t.jsxs(o,{to:"/",className:"group flex items-center space-x-2 rounded-full bg-white bg-opacity-10 px-6 py-3 backdrop-blur-lg transition-all duration-300 hover:bg-opacity-20",children:[t.jsx(x,{size:20,className:"transition-transform duration-300 group-hover:-translate-x-1"}),t.jsx("span",{children:"Go back"})]}),t.jsxs(o,{to:"/",className:"group flex items-center space-x-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-white transition-all duration-300 hover:from-purple-700 hover:to-pink-700",children:[t.jsx(d,{size:20}),t.jsx("span",{children:s>0?`Return to home in ${s}s`:"Return to home"})]})]}),t.jsx("div",{className:"absolute bottom-8 right-8 animate-float hidden md:block",style:{animation:"float 6s ease-in-out infinite",transform:`translate(${e.x*-40}px, ${e.y*-40}px)`,transition:"transform 0.2s ease-out"},children:t.jsxs("div",{className:"relative",children:[t.jsx("div",{className:"absolute -inset-2 rounded-full opacity-50 blur-lg",style:{background:"linear-gradient(to right, #8b5cf6, #ec4899)"}}),t.jsx("div",{className:"relative flex h-16 w-16 items-center justify-center rounded-full bg-black p-2",children:t.jsx(p,{className:"h-10 w-10 text-white"})}),t.jsx("div",{className:"absolute -bottom-8 left-1/2 h-8 w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-500 to-transparent opacity-50"})]})})]}),t.jsx("style",{children:`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-0 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        
        @keyframes float-1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(40px); }
        }
        
        @keyframes float-2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-50px); }
        }
        
        @keyframes float-3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(25px); }
        }
        
        @keyframes float-4 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes float-5 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(35px); }
        }
      `})]})};export{g as default};
