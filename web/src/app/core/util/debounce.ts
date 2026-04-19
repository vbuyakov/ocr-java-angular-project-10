/** Schedules `fn` after `ms` of quiet time; each call resets the timer. */
export function debounceLeadingEdge(ms: number, fn: () => void): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (t !== undefined) {
      clearTimeout(t);
    }
    t = setTimeout(() => {
      t = undefined;
      fn();
    }, ms);
  };
}
