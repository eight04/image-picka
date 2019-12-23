/* exported createProgressBar */
function createProgressBar() {
  let total = 0;
  let completed = 0;
  const el = document.createElement("div");
  el.className = "progress-bar";
  update();
  document.body.appendChild(el);
  return {add};
  
  function add(p) {
    total++;
    update();
    p
      .catch(err => {
        console.error(err);
        el.classList.add("error");
      })
      .then(() => {
        completed++;
        update();
      });
  }
  
  function update() {
    el.classList.toggle("started", total > 0);
    el.classList.toggle("finished", completed === total);
    el.style.setProperty("--progress-total", total);
    el.style.setProperty("--progress-completed", completed);
  }
}
