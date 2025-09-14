import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EditorService } from '../EditorService';

describe('EditorService', () => {
  let editorService: EditorService;

  beforeEach(() => {
    editorService = new EditorService();

    // 仮置き
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    editorService.destroy();
    vi.clearAllMocks();
  });

  describe('initializeEditor', () => {
    it('should initialize editor with initial text and cursor position', async () => {
      const initialText = 'Hello World';
      const cursorLine = 5;

      await editorService.initializeEditor(initialText, cursorLine);

      expect(editorService['currentText']).toBe(initialText);
      expect(editorService['currentCursorLine']).toBe(cursorLine);
      expect(console.log).toHaveBeenCalledWith(
        'Editor initialized with text:',
        initialText,
        'cursor:',
        cursorLine
      );
    });

    it('should initialize editor with default cursor position when not provided', async () => {
      const initialText = 'Test text';

      await editorService.initializeEditor(initialText);

      expect(editorService['currentText']).toBe(initialText);
      expect(editorService['currentCursorLine']).toBe(0);
    });

    it('should handle empty text initialization', async () => {
      const initialText = '';

      await editorService.initializeEditor(initialText);

      expect(editorService['currentText']).toBe('');
      expect(editorService['currentCursorLine']).toBe(0);
    });
  });

  describe('onTextChange', () => {
    it('should register text change callback', () => {
      const callback = vi.fn();

      editorService.onTextChange(callback);

      expect(editorService['textChangeCallbacks']).toContain(callback);
    });

    it('should register multiple text change callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      editorService.onTextChange(callback1);
      editorService.onTextChange(callback2);

      expect(editorService['textChangeCallbacks']).toHaveLength(2);
      expect(editorService['textChangeCallbacks']).toContain(callback1);
      expect(editorService['textChangeCallbacks']).toContain(callback2);
    });
  });

  describe('emitTextChange', () => {
    it('should call registered callbacks after debounce delay', async () => {
      const callback = vi.fn();
      editorService.onTextChange(callback);

      editorService.emitTextChange('new text');

      expect(callback).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 600));
      expect(callback).toHaveBeenCalledWith('new text');
    });

    it('should debounce multiple rapid text changes', async () => {
      const callback = vi.fn();
      editorService.onTextChange(callback);

      editorService.emitTextChange('text1');
      editorService.emitTextChange('text2');
      editorService.emitTextChange('text3');

      await new Promise(resolve => setTimeout(resolve, 600));
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('text3');
    });

    it('should call all registered callbacks', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      editorService.onTextChange(callback1);
      editorService.onTextChange(callback2);

      editorService.emitTextChange('test text');

      await new Promise(resolve => setTimeout(resolve, 600));
      expect(callback1).toHaveBeenCalledWith('test text');
      expect(callback2).toHaveBeenCalledWith('test text');
    });

    it('should clear previous timer when new text change is emitted', async () => {
      const callback = vi.fn();
      editorService.onTextChange(callback);

      editorService.emitTextChange('first text');

      await new Promise(resolve => setTimeout(resolve, 200));
      editorService.emitTextChange('second text');

      await new Promise(resolve => setTimeout(resolve, 600));
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('second text');
    });
  });

  describe('updateText', () => {
    it('should update current text', () => {
      const newText = 'Updated text';

      editorService.updateText(newText);

      expect(editorService['currentText']).toBe(newText);
      expect(console.log).toHaveBeenCalledWith(
        'Editor text updated to:',
        newText
      );
    });

    it('should handle empty text update', () => {
      editorService.updateText('');

      expect(editorService['currentText']).toBe('');
      expect(console.log).toHaveBeenCalledWith('Editor text updated to:', '');
    });

    it('should handle multiline text update', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';

      editorService.updateText(multilineText);

      expect(editorService['currentText']).toBe(multilineText);
    });
  });

  describe('setCursorLine', () => {
    it('should update cursor line position', () => {
      const line = 10;

      editorService.setCursorLine(line);

      expect(editorService['currentCursorLine']).toBe(line);
      expect(console.log).toHaveBeenCalledWith('Cursor moved to line:', line);
    });

    it('should handle zero cursor line', () => {
      editorService.setCursorLine(0);

      expect(editorService['currentCursorLine']).toBe(0);
    });

    it('should handle negative cursor line', () => {
      editorService.setCursorLine(-1);

      expect(editorService['currentCursorLine']).toBe(-1);
    });
  });

  describe('destroy', () => {
    it('should clear debounce timer', () => {
      const callback = vi.fn();
      editorService.onTextChange(callback);

      editorService.emitTextChange('test');
      editorService.destroy();

      return new Promise(resolve => {
        setTimeout(() => {
          expect(callback).not.toHaveBeenCalled();
          resolve(undefined);
        }, 600);
      });
    });

    it('should clear all callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      editorService.onTextChange(callback1);
      editorService.onTextChange(callback2);

      editorService.destroy();

      expect(editorService['textChangeCallbacks']).toHaveLength(0);
    });

    it('should reset internal state', () => {
      editorService['currentText'] = 'some text';
      editorService['currentCursorLine'] = 5;

      editorService.destroy();

      expect(editorService['currentText']).toBe('');
      expect(editorService['currentCursorLine']).toBe(0);
    });

    it('should log destruction message', () => {
      editorService.destroy();

      expect(console.log).toHaveBeenCalledWith('Editor destroyed');
    });

    it('should handle multiple destroy calls', () => {
      editorService.destroy();
      editorService.destroy();

      expect(console.log).toHaveBeenCalledWith('Editor destroyed');
    });
  });
});
