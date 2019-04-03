/* exported createCounter */

function createCounter() {
  const map = new Map;
  return {add, delete: delete_, toList};
  
  function add(item) {
    const old = map.get(item);
    map.set(item, (old || 0) + 1);
  }
  
  function delete_(item) {
    const old = map.get(item);
    if (old > 1) {
      map.set(item, old - 1);
    } else {
      map.delete(item);
    }
  }
  
  function toList() {
    const arr = [];
    for (const [item, count] of map.entries()) {
      for (let i = 0; i < count; i++) {
        arr.push(item);
      }
    }
    return arr;
  }
}
