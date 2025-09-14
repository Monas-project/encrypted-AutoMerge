/**
 * Editor service implementation
 * Manages editor integration
 */
export class EditorService {
  private textChangeCallbacks: ((text: string) => void)[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 500; // 500ms

  /**
   * Set text change event listener
   * @param callback Callback for text changes
   */
  onTextChange(callback: (text: string) => void): void {
    this.textChangeCallbacks.push(callback);
  }

  /**
   * Emit text change event (called from editor)
   * Executes callback after 500ms due to debounce functionality
   * @param text New text
   */
  emitTextChange(text: string): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.textChangeCallbacks.forEach(callback => callback(text));
      this.debounceTimer = null;
    }, this.DEBOUNCE_DELAY);
  }
}
