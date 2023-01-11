
const d = document.createElement('div');
d.innerText="ech";
d.style.color = 'white';
// document.appendChild(d);
document.getElementsByTagName('body').item(0)?.appendChild(d);
