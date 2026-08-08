// The shape from fluixi.com's install strip: a static element whose only dynamic part is a
// text hole holding a plain string.
export function TextHoleApp() {
  const cmd = 'npm create fluixi@latest';
  return (
    <div class="install">
      <span class="prompt">$</span>
      <code class="cmd">{cmd}</code>
      <button class="copy">copy</button>
    </div>
  );
}
