/* exported throttle defer */

function throttle(size = 5) {
  const waiting = [];
  let running = 0;
  return {add, addCallback};
  
  function add(fn) {
    const task = defer();
    task.fn = fn;
    waiting.push(task);
    deque();
    return task.promise;
  }
  
  function addCallback(callback) {
    return add(() => new Promise(callback));
  }
  
  function deque() {
    if (!waiting.length || running >= size) {
      return;
    }
    const task = waiting.shift();
    running++;
    const pending = task.fn();
    pending.then(task.resolve, task.reject);
    pending
      .catch(() => {})
      .then(() => {
        running--;
        deque();
      });
  }
}

function defer() {
  const o = {};
  o.promise = new Promise((resolve, reject) => {
    o.resolve = resolve;
    o.reject = reject;
  });
  return o;
}
