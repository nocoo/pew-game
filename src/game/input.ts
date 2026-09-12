// Keyboard and touch input share the same normalized movement rules.

export class InputManager {
  private readonly pressed = new Set<string>();
  private readonly touchPressed = new Set<string>();
  private bound = false;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof Element && e.target.closest("input, textarea, select, button, a, [contenteditable='true']")) return;
    const key = e.key.toLowerCase();
    this.pressed.add(key);

    // prevent arrow keys from scrolling the page
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      e.preventDefault();
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.key.toLowerCase());
  };

  private readonly clear = (): void => {
    this.pressed.clear();
    this.touchPressed.clear();
  };

  setTouchKey(key: string, down: boolean): void {
    if (down) this.touchPressed.add(key);
    else this.touchPressed.delete(key);
  }

  bind(): void {
    if (this.bound) return;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
    this.bound = true;
  }

  unbind(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
    this.clear();
    this.bound = false;
  }

  isDown(key: string): boolean {
    return this.pressed.has(key.toLowerCase()) || this.touchPressed.has(key.toLowerCase());
  }

  /** Returns normalized direction vector from WASD / arrow keys */
  getDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.isDown("w") || this.isDown("arrowup")) y -= 1;
    if (this.isDown("s") || this.isDown("arrowdown")) y += 1;
    if (this.isDown("a") || this.isDown("arrowleft")) x -= 1;
    if (this.isDown("d") || this.isDown("arrowright")) x += 1;

    // normalize diagonal movement
    const len = Math.sqrt(x * x + y * y);
    if (len > 0) {
      x /= len;
      y /= len;
    }

    return { x, y };
  }
}
