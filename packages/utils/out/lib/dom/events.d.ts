/**
 * A mapping of common DOM event names to their corresponding TypeScript event interfaces.
 * This enables intelligent type inference for standard browser events.
 *
 * @interface DomEventMap
 *
 * @property {MouseEvent} 'click' - Mouse click events
 * @property {MouseEvent} 'dblclick' - Mouse double-click events
 * @property {MouseEvent} 'mousedown' - Mouse button down events
 * @property {MouseEvent} 'mouseup' - Mouse button up events
 * @property {MouseEvent} 'mousemove' - Mouse movement events
 * @property {MouseEvent} 'mouseenter' - Mouse enter events
 * @property {MouseEvent} 'mouseleave' - Mouse leave events
 * @property {KeyboardEvent} 'keydown' - Keyboard key down events
 * @property {KeyboardEvent} 'keyup' - Keyboard key up events
 * @property {KeyboardEvent} 'keypress' - Keyboard key press events (deprecated)
 * @property {Event} 'change' - Form change events
 * @property {InputEvent} 'input' - Form input events
 * @property {Event} 'submit' - Form submit events
 * @property {FocusEvent} 'focus' - Element focus events
 * @property {FocusEvent} 'blur' - Element blur events
 * @property {DragEvent} 'drag' - Drag events
 * @property {DragEvent} 'dragstart' - Drag start events
 * @property {DragEvent} 'dragend' - Drag end events
 * @property {DragEvent} 'dragover' - Drag over events
 * @property {DragEvent} 'drop' - Drop events
 * @property {Event} 'play' - Media play events
 * @property {Event} 'pause' - Media pause events
 * @property {Event} 'ended' - Media ended events
 * @property {Event} 'load' - Resource load events
 * @property {Event} 'unload' - Resource unload events
 * @property {UIEvent} 'resize' - Window resize events
 * @property {Event} 'scroll' - Scroll events
 */
export interface DomEventMap {
    click: MouseEvent;
    dblclick: MouseEvent;
    mousedown: MouseEvent;
    mouseup: MouseEvent;
    mousemove: MouseEvent;
    mouseenter: MouseEvent;
    mouseleave: MouseEvent;
    keydown: KeyboardEvent;
    keyup: KeyboardEvent;
    keypress: KeyboardEvent;
    change: Event;
    input: InputEvent;
    submit: Event;
    focus: FocusEvent;
    blur: FocusEvent;
    drag: DragEvent;
    dragstart: DragEvent;
    dragend: DragEvent;
    dragover: DragEvent;
    drop: DragEvent;
    play: Event;
    pause: Event;
    ended: Event;
    load: Event;
    unload: Event;
    resize: UIEvent;
    scroll: Event;
}
/**
 * Interface for Node.js EventEmitter compatibility.
 * This allows `fromEvent` to work with Node.js event emitters.
 *
 * @interface NodeEventEmitter
 *
 * @method addEventListener - Adds an event listener (Node.js style)
 * @param {string|symbol} event - The event name
 * @param {Function} listener - The event listener function
 *
 * @method removeEventListener - Removes an event listener (Node.js style)
 * @param {string|symbol} event - The event name
 * @param {Function} listener - The event listener function
 */
export interface NodeEventEmitter {
    addEventListener(event: string | symbol, listener: (...args: any[]) => void): void;
    removeEventListener(event: string | symbol, listener: (...args: any[]) => void): void;
}
/**
 * Union type representing all supported event target types.
 * `fromEvent` can work with DOM elements, Node.js EventEmitters, jQuery-like objects,
 * and any object with `on`/`off` or `addListener`/`removeListener` methods.
 *
 * @typedef {EventTarget|NodeEventEmitter|{on:Function, off:Function}|{addListener:Function, removeListener:Function}} EventTargetLike
 */
export type EventTargetLike = EventTarget | NodeEventEmitter | {
    on(event: string, handler: (...args: any[]) => void): void;
    off(event: string, handler: (...args: any[]) => void): void;
} | {
    addListener(event: string, handler: (...args: any[]) => void): void;
    removeListener(event: string, handler: (...args: any[]) => void): void;
};
/**
 * Infers the specific Event type based on the event name and target.
 * This is a conditional type that provides intelligent type inference:
 * 1. First checks against the standard DomEventMap
 * 2. Then checks if the target has its own event type definitions
 * 3. Falls back to the basic Event type
 *
 * @template EventName - The string literal type of the event name (e.g., 'click', 'keydown')
 * @template Target - The type of the event target
 *
 * @example
 * // Returns MouseEvent
 * type ClickEvent = EventFor<'click', HTMLButtonElement>;
 *
 * @example
 * // Returns KeyboardEvent
 * type KeydownEvent = EventFor<'keydown', HTMLInputElement>;
 */
export type EventFor<EventName extends string, Target extends EventTargetLike = EventTarget> = EventName extends keyof DomEventMap ? DomEventMap[EventName] : Target extends {
    addEventListener(type: infer E, listener: any, options?: any): any;
} ? E extends string ? EventName extends E ? Event : never : Event : Event;
/**
 * Type guard to check if an object is a DOM EventTarget.
 *
 * @param {any} target - The object to check
 * @returns {target is EventTarget} True if the object is a DOM EventTarget
 *
 * @private
 */
export declare function isDOMEventTarget(target: any): target is EventTarget;
/**
 * Type guard to check if an object is a Node.js EventEmitter.
 *
 * @param {any} target - The object to check
 * @returns {target is NodeEventEmitter} True if the object is a NodeEventEmitter
 *
 * @private
 */
export declare function isNodeEventEmitter(target: any): target is NodeEventEmitter;
/**
 * Type guard to check if an object has on/off methods (jQuery-style).
 *
 * @param {any} target - The object to check
 * @returns {target is {on: Function, off: Function}} True if the object has on/off methods
 *
 * @private
 */
export declare function isOnOffTarget(target: any): target is {
    on: Function;
    off: Function;
};
/**
 * Type guard to check if an object has addListener/removeListener methods.
 *
 * @param {any} target - The object to check
 * @returns {target is {addListener: Function, removeListener: Function}} True if the object has addListener/removeListener methods
 *
 * @private
 */
export declare function isAddRemoveListenerTarget(target: any): target is {
    addListener: Function;
    removeListener: Function;
};
//# sourceMappingURL=events.d.ts.map