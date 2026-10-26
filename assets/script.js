
const b=document.querySelector('.menu'), n=document.querySelector('.navlinks');
if(b&&n){b.addEventListener('click',()=>{const o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)})}
