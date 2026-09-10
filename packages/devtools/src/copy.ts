/**
 * Putting text on the clipboard from wherever a panel happens to be running.
 *
 * `navigator.clipboard` is not there in a vscode webview without permission, nor on an
 * insecure origin. The hidden textarea is the old way and still the one that works in both.
 */

/** Says so on the control that was pressed: a toast needs somewhere to live. */
function confirmOn(button: HTMLElement | undefined, said = 'copied'): void {
  if (!button) return;
  const was = button.textContent;
  button.textContent = said;
  setTimeout(() => {
    button.textContent = was;
  }, 1200);
}

function fallback(text: string, button?: HTMLElement): boolean {
  try {
    const doc = button?.ownerDocument ?? document;
    const area = doc.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    doc.body.appendChild(area);
    area.select();
    doc.execCommand('copy');
    area.remove();
    confirmOn(button);
    return true;
  } catch {
    // Nothing left to try; whatever is on screen can still be selected by hand.
    return false;
  }
}

/** True when the text reached the clipboard. */
export async function copyText(text: string, button?: HTMLElement): Promise<boolean> {
  const clipboard = (globalThis as { navigator?: { clipboard?: { writeText(t: string): Promise<void> } } })
    .navigator?.clipboard;
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      confirmOn(button);
      return true;
    } catch {
      // Denied, or a context the api refuses to work in.
    }
  }
  return fallback(text, button);
}
