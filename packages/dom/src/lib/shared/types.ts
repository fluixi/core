/**
 * Component props type - any object
 */
export interface ComponentProps {
  children?: ComponentChild | ComponentChild[];
  [key: string]: any;
}

/**
 * Component child types
 */
export type ComponentChild =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | ComponentChild[]
  | (() => ComponentChild)
  | import('lit').TemplateResult
  | (() => any)
  | any;

/**
 * Component function type
 */
export type ComponentFn<P = ComponentProps> = (props?: P) => ComponentChild;
export type Component<P = ComponentProps> = ComponentFn<P> | ComponentChild;
