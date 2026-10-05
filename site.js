(function(){
  var d=document, r=d.documentElement, k="theme";
  r.classList.add("js");

  // Theme toggle
  var t=d.querySelector(".theme-btn, .theme-toggle");
  if(t){
    t.addEventListener("click", function(){
      var n=r.getAttribute("data-theme")==="dark"?"light":"dark";
      r.setAttribute("data-theme",n);
      try{localStorage.setItem(k,n)}catch(e){}
      t.setAttribute("aria-pressed",n==="dark");
    });
    t.setAttribute("aria-pressed",r.getAttribute("data-theme")==="dark");
  }

  // Mobile menu
  var m=d.querySelector(".menu-btn"), l=d.getElementById("navlist");
  if(m && l){
    m.classList.add("js");
    var q=matchMedia("(max-width:899px)");
    function s(o){
      l.hidden=!o;
      m.setAttribute("aria-expanded",o);
    }
    s(!q.matches);
    q.addEventListener("change",function(){s(!q.matches)});
    m.addEventListener("click",function(){s(l.hidden)});
    d.addEventListener("keydown",function(e){
      if(e.key==="Escape" && q.matches && !l.hidden){
        s(false);
        m.focus();
      }
    });
  }

  // Show data buttons
  d.querySelectorAll(".show-data").forEach(function(b){
    var p=d.getElementById(b.getAttribute("aria-controls"));
    if(!p)return;
    b.hidden=false;
    b.addEventListener("click",function(){
      var o=p.classList.toggle("sr-only");
      b.setAttribute("aria-expanded",!o);
      b.textContent=o?"Show data":"Hide data";
    });
  });

  // Replay animation
  d.querySelectorAll(".anim-replay").forEach(function(b){
    b.addEventListener("click",function(){
      var f=b.closest("figure")||d.querySelector(".gate-anim");
      if(f){
        f.classList.remove("on");
        void f.offsetWidth;
        f.classList.add("on");
      }
    });
  });

  // Scroll progress for case studies and articles
  var sp=d.querySelector(".scroll-progress");
  if(sp){
    window.addEventListener("scroll",function(){
      var h=document.documentElement.scrollHeight - window.innerHeight;
      if(h>0){
        var pct=Math.min(100, Math.max(0, (window.scrollY / h) * 100));
        sp.style.width=pct+"%";
      }
    }, {passive:true});
  }

  // IntersectionObserver for animations
  var g=d.querySelectorAll(".draw,.gate-anim");
  if(g.length&&"IntersectionObserver"in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add("on");
          io.unobserve(e.target);
        }
      });
    },{threshold:.3});
    g.forEach(function(x){io.observe(x)});
  } else {
    g.forEach(function(x){x.classList.add("on")});
  }

  // Open details on anchor jump
  function od(){
    var h=location.hash;
    if(!h)return;
    var e=d.getElementById(h.slice(1));
    var x=e&&e.closest("details");
    if(x)x.open=true;
  }
  addEventListener("hashchange",od);
  od();
})();
