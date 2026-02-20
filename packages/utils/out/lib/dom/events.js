/**
 * Type guard to check if an object is a DOM EventTarget.
 *
 * @param {any} target - The object to check
 * @returns {target is EventTarget} True if the object is a DOM EventTarget
 *
 * @private
 */
export function isDOMEventTarget(target) {
    return target && typeof target.addEventListener === 'function';
}
/**
 * Type guard to check if an object is a Node.js EventEmitter.
 *
 * @param {any} target - The object to check
 * @returns {target is NodeEventEmitter} True if the object is a NodeEventEmitter
 *
 * @private
 */
export function isNodeEventEmitter(target) {
    return (target &&
        typeof target.addEventListener === 'function' &&
        typeof target.removeEventListener === 'function');
}
/**
 * Type guard to check if an object has on/off methods (jQuery-style).
 *
 * @param {any} target - The object to check
 * @returns {target is {on: Function, off: Function}} True if the object has on/off methods
 *
 * @private
 */
export function isOnOffTarget(target) {
    return (target &&
        typeof target.on === 'function' &&
        typeof target.off === 'function');
}
/**
 * Type guard to check if an object has addListener/removeListener methods.
 *
 * @param {any} target - The object to check
 * @returns {target is {addListener: Function, removeListener: Function}} True if the object has addListener/removeListener methods
 *
 * @private
 */
export function isAddRemoveListenerTarget(target) {
    return (target &&
        typeof target.addListener === 'function' &&
        typeof target.removeListener === 'function');
}
