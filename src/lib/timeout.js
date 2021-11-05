export function timeout(t) {
  return new Promise(resolve => setTimeout(resolve, t));
}
