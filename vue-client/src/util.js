export function sleep(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export function debounce(fn, delay) {
  let timeoutID = null;
  return () => {
    clearTimeout(timeoutID);
    const args = arguments;
    timeoutID = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
