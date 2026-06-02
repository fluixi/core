#!/usr/bin/env node

/**
 * @fileoverview KettleJS CLI - Command-line interface for project and component generation
 * @module @fluixi/kettlejs/cli
 */

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

/**
 * CLI version
 */
const VERSION = '0.0.1';

/**
 * Component template types
 */
type ComponentType =
  | 'basic'
  | 'with-state'
  | 'with-resource'
  | 'with-router'
  | 'full';

type ComponentPattern =
  | 'kettlelement'
  | 'withsignals'
  | 'controller'
  | 'functional'
  | 'litelement';

/**
 * Component mode types
 */
type ComponentMode = 'lit-html' | 'jsx' | 'react-bridge';

/**
 * Project template types
 */
type ProjectTemplate = 'minimal' | 'standard' | 'full';

/**
 * Generates a basic component template
 * @param {string} name - Component name
 * @returns {string} Component code
 */
function generateBasicComponent(
  name: string,
  pattern: ComponentPattern = 'functional'
): string {
  if (pattern === 'kettlelement') {
    return `/**
 * @fileoverview ${name} component
 */

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KettleElement } from '@fluixi/kettlejs';

/**
 * ${name} component using KettleElement pattern
 *
 * @example
 * \`\`\`html
 * <${name.toLowerCase()}></${name.toLowerCase()}>
 * \`\`\`
 */
@customElement('${name.toLowerCase()}')
export class ${name} extends KettleElement {
  view() {
    return html\`
      <div class="${name.toLowerCase()}">
        <h2>${name}</h2>
        <p>Component created with KettleJS CLI (KettleElement pattern)</p>
      </div>
    \`;
  }
}

export default ${name};
`;
  }

  if (pattern === 'withsignals') {
    return `/**
 * @fileoverview ${name} component
 */

import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { WithSignals } from '@fluixi/kettlejs';

/**
 * ${name} component using WithSignals mixin
 *
 * @example
 * \`\`\`html
 * <${name.toLowerCase()}></${name.toLowerCase()}>
 * \`\`\`
 */
@customElement('${name.toLowerCase()}')
export class ${name} extends WithSignals(LitElement) {
  render() {
    return html\`
      <div class="${name.toLowerCase()}">
        <h2>${name}</h2>
        <p>Component created with KettleJS CLI (WithSignals pattern)</p>
      </div>
    \`;
  }
}

export default ${name};
`;
  }

  if (pattern === 'controller') {
    return `/**
 * @fileoverview ${name} component
 */

import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SignalController } from '@fluixi/kettlejs';

/**
 * ${name} component using manual controller pattern
 *
 * @example
 * \`\`\`html
 * <${name.toLowerCase()}></${name.toLowerCase()}>
 * \`\`\`
 */
@customElement('${name.toLowerCase()}')
export class ${name} extends LitElement {
  private signals = new SignalController(this);

  render() {
    return html\`
      <div class="${name.toLowerCase()}">
        <h2>${name}</h2>
        <p>Component created with KettleJS CLI (Controller pattern)</p>
      </div>
    \`;
  }
}

export default ${name};
`;
  }

  if (pattern === 'litelement') {
    return `/**
 * @fileoverview ${name} component
 */

import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * ${name} component using plain LitElement
 *
 * @example
 * \`\`\`html
 * <${name.toLowerCase()}></${name.toLowerCase()}>
 * \`\`\`
 */
@customElement('${name.toLowerCase()}')
export class ${name} extends LitElement {
  static styles = css\`
    :host {
      display: block;
      padding: 1rem;
    }

    .${name.toLowerCase()} {
      font-family: sans-serif;
    }
  \`;

  render() {
    return html\`
      <div class="${name.toLowerCase()}">
        <h2>${name}</h2>
        <p>Component created with KettleJS CLI (LitElement pattern)</p>
      </div>
    \`;
  }
}

export default ${name};
`;
  }

  // Functional pattern (default)
  return `/**
 * @fileoverview ${name} component
 */

import { html, Component, ComponentProps } from '@fluixi/kettlejs';

/**
 * Props for ${name} component
 */
export interface ${name}Props extends ComponentProps {
  // Add your props here
}

/**
 * ${name} component (functional pattern)
 * @param {${name}Props} props - Component props
 * @returns {TemplateResult} Rendered template
 *
 * @example
 * \`\`\`typescript
 * const MyPage = () => {
 *   return html\`
 *     <div>
 *       \${${name}({})}
 *     </div>
 *   \`;
 * };
 * \`\`\`
 */
export const ${name}: Component<${name}Props> = (props) => {
  return html\`
    <div class="${name.toLowerCase()}">
      <h2>${name}</h2>
      <p>Component created with KettleJS CLI</p>
    </div>
  \`;
};

export default ${name};
`;
}

/**
 * Generates a component with state
 * @param {string} name - Component name
 * @param {ComponentPattern} pattern - Component pattern to use
 * @returns {string} Component code
 */
function generateComponentWithState(
  name: string,
  pattern: ComponentPattern = 'functional'
): string {
  if (pattern === 'litelement') {
    return `/**
 * @fileoverview ${name} component with state
 */

import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * ${name} component with state using plain LitElement
 *
 * @example
 * \`\`\`html
 * <${name.toLowerCase()}></${name.toLowerCase()}>
 * \`\`\`
 */
@customElement('${name.toLowerCase()}')
export class ${name} extends LitElement {
  static styles = css\`
    :host {
      display: block;
      padding: 1rem;
    }

    .${name.toLowerCase()} {
      font-family: sans-serif;
    }

    .counter {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin: 1rem 0;
    }

    button {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      cursor: pointer;
    }

    .count {
      font-size: 2rem;
      font-weight: bold;
      min-width: 3rem;
      text-align: center;
    }
  \`;

  @state()
  private count = 0;

  @state()
  private message = '';

  connectedCallback() {
    super.connectedCallback();
    this.updateMessage();
  }

  private updateMessage() {
    this.message = \`Count is \${this.count}\`;
  }

  private increment() {
    this.count++;
    this.updateMessage();
  }

  private decrement() {
    this.count--;
    this.updateMessage();
  }

  private reset() {
    this.count = 0;
    this.updateMessage();
  }

  render() {
    return html\`
      <div class="${name.toLowerCase()}">
        <h2>${name} Counter</h2>
        <p>\${this.message}</p>
        <div class="counter">
          <button @click=\${this.decrement}>-</button>
          <span class="count">\${this.count}</span>
          <button @click=\${this.increment}>+</button>
        </div>
        <button @click=\${this.reset}>Reset</button>
      </div>
    \`;
  }
}

export default ${name};
`;
  }

  if (pattern === 'kettlelement') {
    return `/**
 * @fileoverview ${name} component with reactive state
 */

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KettleElement } from '@fluixi/kettlejs';
import { createSignal, createEffect } from '@fluixi/reactive';

/**
 * ${name} component with reactive state using KettleElement
 *
 * @example
 * \`\`\`html
 * <${name.toLowerCase()} initial-value="10"></${name.toLowerCase()}>
 * \`\`\`
 */
@customElement('${name.toLowerCase()}')
export class ${name} extends KettleElement {
  private count = createSignal(0);
  private message = createSignal('');

  connectedCallback() {
    super.connectedCallback();

    // Effect to update message when count changes
    this.runInScope(() => {
      createEffect(() => {
        const current = this.count[0]();
        this.message[1](\`Count is \${current}\`);
      });
    });
  }

  private increment = () => this.count[1](c => c + 1);
  private decrement = () => this.count[1](c => c - 1);
  private reset = () => this.count[1](0);

  view() {
    return html\`
      <div class="${name.toLowerCase()}">
        <h2>${name}</h2>
        <div class="counter">
          <p class="count">\${this.count[0]()}</p>
          <p class="message">\${this.message[0]()}</p>
          <div class="controls">
            <button @click=\${this.decrement}>-</button>
            <button @click=\${this.reset}>Reset</button>
            <button @click=\${this.increment}>+</button>
          </div>
        </div>
      </div>
    \`;
  }
}

export default ${name};
`;
  }

  if (pattern === 'withsignals') {
    return `/**
 * @fileoverview ${name} component with reactive state
 */

import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { WithSignals } from '@fluixi/kettlejs';
import { createSignal, createEffect } from '@fluixi/reactive';

/**
 * ${name} component with reactive state using WithSignals mixin
 *
 * @example
 * \`\`\`html
 * <${name.toLowerCase()}></${name.toLowerCase()}>
 * \`\`\`
 */
@customElement('${name.toLowerCase()}')
export class ${name} extends WithSignals(LitElement) {
  private count = createSignal(0);
  private message = createSignal('');

  connectedCallback() {
    super.connectedCallback();

    // Effect to update message when count changes
    this.runInReactiveScope(() => {
      createEffect(() => {
        const current = this.count[0]();
        this.message[1](\`Count is \${current}\`);
      });
    });
  }

  private increment = () => this.count[1](c => c + 1);
  private decrement = () => this.count[1](c => c - 1);
  private reset = () => this.count[1](0);

  render() {
    return html\`
      <div class="${name.toLowerCase()}">
        <h2>${name}</h2>
        <div class="counter">
          <p class="count">\${this.count[0]()}</p>
          <p class="message">\${this.message[0]()}</p>
          <div class="controls">
            <button @click=\${this.decrement}>-</button>
            <button @click=\${this.reset}>Reset</button>
            <button @click=\${this.increment}>+</button>
          </div>
        </div>
      </div>
    \`;
  }
}

export default ${name};
`;
  }

  if (pattern === 'controller') {
    return `/**
 * @fileoverview ${name} component with reactive state
 */

import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SignalController } from '@fluixi/kettlejs';
import { createSignal, createEffect } from '@fluixi/reactive';

/**
 * ${name} component with reactive state using manual controller
 *
 * @example
 * \`\`\`html
 * <${name.toLowerCase()}></${name.toLowerCase()}>
 * \`\`\`
 */
@customElement('${name.toLowerCase()}')
export class ${name} extends LitElement {
  private signals = new SignalController(this);
  private count = createSignal(0);
  private message = createSignal('');

  connectedCallback() {
    super.connectedCallback();

    // Effect to update message when count changes
    this.signals.runInScope(() => {
      createEffect(() => {
        const current = this.count[0]();
        this.message[1](\`Count is \${current}\`);
      });
    });
  }

  private increment = () => this.count[1](c => c + 1);
  private decrement = () => this.count[1](c => c - 1);
  private reset = () => this.count[1](0);

  render() {
    return html\`
      <div class="${name.toLowerCase()}">
        <h2>${name}</h2>
        <div class="counter">
          <p class="count">\${this.count[0]()}</p>
          <p class="message">\${this.message[0]()}</p>
          <div class="controls">
            <button @click=\${this.decrement}>-</button>
            <button @click=\${this.reset}>Reset</button>
            <button @click=\${this.increment}>+</button>
          </div>
        </div>
      </div>
    \`;
  }
}

export default ${name};
`;
  }

  // Functional pattern (default)
  return `/**
 * @fileoverview ${name} component with reactive state
 */

import { html, Component, ComponentProps } from '@fluixi/kettlejs';
import { createSignal, createEffect } from '@fluixi/reactive';

/**
 * Props for ${name} component
 */
export interface ${name}Props extends ComponentProps {
  initialValue?: number;
}

/**
 * ${name} component with reactive state management
 * @param {${name}Props} props - Component props
 * @returns {TemplateResult} Rendered template
 *
 * @example
 * \`\`\`typescript
 * const MyPage = () => {
 *   return html\`
 *     <div>
 *       \${${name}({ initialValue: 10 })}
 *     </div>
 *   \`;
 * };
 * \`\`\`
 */
export const ${name}: Component<${name}Props> = (props) => {
  const [count, setCount] = createSignal(props.initialValue ?? 0);
  const [message, setMessage] = createSignal('');

  // Effect to update message when count changes
  createEffect(() => {
    const current = count();
    setMessage(\`Count is \${current}\`);
  });

  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);
  const reset = () => setCount(props.initialValue ?? 0);

  return html\`
    <div class="${name.toLowerCase()}">
      <h2>${name}</h2>
      <div class="counter">
        <p class="count">\${count()}</p>
        <p class="message">\${message()}</p>
        <div class="controls">
          <button @click=\${decrement}>-</button>
          <button @click=\${reset}>Reset</button>
          <button @click=\${increment}>+</button>
        </div>
      </div>
    </div>
  \`;
};

export default ${name};
`;
}

/**
 * Generates a component with async resource fetching
 * @param {string} name - Component name
 * @param {ComponentPattern} pattern - Component pattern to use
 * @returns {string} Component code
 */
function generateComponentWithResource(
  name: string,
  pattern: ComponentPattern = 'functional'
): string {
  if (pattern === 'litelement') {
    return `/**
 * @fileoverview ${name} component with async resource fetching
 */

import { html, css, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface ${name}Data {
  id: string;
  title: string;
  description: string;
}

/**
 * ${name} component with resource fetching using LitElement
 *
 * @example
 * \`\`\`html
 * <${name.toLowerCase()} resource-id="123"></${name.toLowerCase()}>
 * \`\`\`
 */
@customElement('${name.toLowerCase()}')
export class ${name} extends LitElement {
  static styles = css\`
    :host {
      display: block;
      padding: 1rem;
    }

    .loading, .error {
      padding: 1rem;
      margin: 1rem 0;
    }

    .error {
      color: #dc3545;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
    }

    button {
      padding: 0.5rem 1rem;
      cursor: pointer;
    }
  \`;

  @state()
  private data: ${name}Data | null = null;

  @state()
  private loading = false;

  @state()
  private error: Error | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.fetchData();
  }

  private async fetchData() {
    this.loading = true;
    this.error = null;

    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      if (!response.ok) throw new Error('Failed to fetch');
      const json = await response.json();
      this.data = {
        id: json.id,
        title: json.title,
        description: json.body,
      };
    } catch (err) {
      this.error = err as Error;
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html\`
      <div class="${name.toLowerCase()}">
        <h2>${name}</h2>

        \${this.loading ? html\`<div class="loading">Loading...</div>\` : ''}

        \${this.error ? html\`
          <div class="error">
            <p>Error: \${this.error.message}</p>
            <button @click=\${this.fetchData}>Retry</button>
          </div>
        \` : ''}

        \${this.data && !this.loading && !this.error ? html\`
          <div class="content">
            <h3>\${this.data.title}</h3>
            <p>\${this.data.description}</p>
            <button @click=\${this.fetchData}>Refresh</button>
          </div>
        \` : ''}
      </div>
    \`;
  }
}

export default ${name};
`;
  }

  return `/**
 * @fileoverview ${name} component with async resource fetching
 */

import { html, Component, ComponentProps, createResource, Show } from '@fluixi/kettlejs';

/**
 * Props for ${name} component
 */
export interface ${name}Props extends ComponentProps {
  resourceId?: string | number;
}

/**
 * Data type returned by the resource
 */
interface ${name}Data {
  id: string | number;
  title: string;
  description: string;
  // Add more fields as needed
}

/**
 * Fetches data for the component
 * @param {string | number} id - Resource ID
 * @returns {Promise<${name}Data>} Fetched data
 */
async function fetch${name}Data(id: string | number): Promise<${name}Data> {
  // Replace with your actual API call
  const response = await fetch(\`/api/${name.toLowerCase()}/\${id}\`);

  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }

  return response.json();
}

/**
 * ${name} component with async resource fetching
 * @param {${name}Props} props - Component props
 * @returns {TemplateResult} Rendered template
 *
 * @example
 * \`\`\`typescript
 * const MyPage = () => {
 *   return html\`
 *     <div>
 *       \${${name}({ resourceId: '123' })}
 *     </div>
 *   \`;
 * };
 * \`\`\`
 */
export const ${name}: Component<${name}Props> = (props) => {
  const [data, { refetch }] = createResource(
    () => props.resourceId ?? '1',
    fetch${name}Data,
    {
      onError: (error) => console.error('Failed to load ${name}:', error),
    }
  );

  return html\`
    <div class="${name.toLowerCase()}">
      <h2>${name}</h2>

      \${Show({
        when: data.loading,
        children: html\`<div class="loading">Loading...</div>\`,
      })}

      \${Show({
        when: data.error,
        children: html\`
          <div class="error">
            <p>Error: \${data.error?.message}</p>
            <button @click=\${refetch}>Retry</button>
          </div>
        \`,
      })}

      \${Show({
        when: () => data() && !data.loading && !data.error,
        children: () => {
          const resource = data()!;
          return html\`
            <div class="content">
              <h3>\${resource.title}</h3>
              <p>\${resource.description}</p>
              <button @click=\${refetch}>Refresh</button>
            </div>
          \`;
        },
      })}
    </div>
  \`;
};

export default ${name};
`;
}

/**
 * Generates a component with router integration
 * @param {string} name - Component name
 * @param {ComponentPattern} pattern - Component pattern to use
 * @returns {string} Component code
 */
function generateComponentWithRouter(
  name: string,
  pattern: ComponentPattern = 'functional'
): string {
  if (pattern === 'litelement') {
    return `/**
 * @fileoverview ${name} component with router integration
 */

import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * ${name} component with router integration using LitElement
 *
 * @example
 * \`\`\`html
 * <${name.toLowerCase()}></${name.toLowerCase()}>
 * \`\`\`
 */
@customElement('${name.toLowerCase()}')
export class ${name} extends LitElement {
  static styles = css\`
    :host {
      display: block;
      padding: 1rem;
    }

    nav {
      display: flex;
      gap: 1rem;
      margin: 1rem 0;
      padding: 1rem;
      background: #f5f5f5;
    }

    nav a {
      padding: 0.5rem 1rem;
      text-decoration: none;
      color: #333;
      background: white;
      border-radius: 4px;
    }

    nav a:hover {
      background: #007bff;
      color: white;
    }

    .route-info {
      margin: 1rem 0;
      padding: 1rem;
      background: #e9ecef;
    }
  \`;

  @state()
  private currentPath = window.location.pathname;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', this.handlePopState);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handlePopState);
  }

  private handlePopState = () => {
    this.currentPath = window.location.pathname;
  };

  private navigate(path: string) {
    window.history.pushState({}, '', path);
    this.currentPath = path;
  }

  render() {
    return html\`
      <div class="${name.toLowerCase()}">
        <h2>${name} - Router Component</h2>

        <nav>
          <a href="/" @click=\${(e: Event) => {
            e.preventDefault();
            this.navigate('/');
          }}>Home</a>
          <a href="/about" @click=\${(e: Event) => {
            e.preventDefault();
            this.navigate('/about');
          }}>About</a>
          <a href="/contact" @click=\${(e: Event) => {
            e.preventDefault();
            this.navigate('/contact');
          }}>Contact</a>
        </nav>

        <div class="route-info">
          <p><strong>Current Route:</strong> \${this.currentPath}</p>
          <p>Router integration active</p>
        </div>

        <div class="content">
          \${this.renderRoute()}
        </div>
      </div>
    \`;
  }

  private renderRoute() {
    switch (this.currentPath) {
      case '/':
        return html\`<h3>Home Page</h3><p>Welcome to the home page!</p>\`;
      case '/about':
        return html\`<h3>About Page</h3><p>Learn more about us.</p>\`;
      case '/contact':
        return html\`<h3>Contact Page</h3><p>Get in touch with us.</p>\`;
      default:
        return html\`<h3>404 Not Found</h3><p>Page not found.</p>\`;
    }
  }
}

export default ${name};
`;
  }

  return `/**
 * @fileoverview ${name} component with router integration
 */

import {
  html,
  Component,
  ComponentProps,
  useParams,
  useNavigate,
  useLocation,
  createSignal,
} from '@fluixi/kettlejs';

/**
 * Props for ${name} component
 */
export interface ${name}Props extends ComponentProps {
  // Add your props here
}

/**
 * ${name} component with router integration
 * @param {${name}Props} props - Component props
 * @returns {TemplateResult} Rendered template
 *
 * @example
 * \`\`\`typescript
 * // In your routes configuration:
 * const routes = [
 *   {
 *     path: '/${name.toLowerCase()}/:id',
 *     component: ${name}
 *   }
 * ];
 * \`\`\`
 */
export const ${name}: Component<${name}Props> = (props) => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedTab, setSelectedTab] = createSignal('overview');

  const goBack = () => {
    navigate(-1);
  };

  const navigateToTab = (tab: string) => {
    setSelectedTab(tab);
    navigate(\`\${location().pathname}?tab=\${tab}\`);
  };

  return html\`
    <div class="${name.toLowerCase()}">
      <div class="header">
        <button @click=\${goBack}>← Back</button>
        <h2>${name}</h2>
        <p>ID: \${params.id || 'N/A'}</p>
      </div>

      <div class="tabs">
        <button
          class=\${selectedTab() === 'overview' ? 'active' : ''}
          @click=\${() => navigateToTab('overview')}
        >
          Overview
        </button>
        <button
          class=\${selectedTab() === 'details' ? 'active' : ''}
          @click=\${() => navigateToTab('details')}
        >
          Details
        </button>
        <button
          class=\${selectedTab() === 'settings' ? 'active' : ''}
          @click=\${() => navigateToTab('settings')}
        >
          Settings
        </button>
      </div>

      <div class="content">
        <p>Current tab: \${selectedTab()}</p>
        <p>Full path: \${location().pathname}</p>
      </div>
    </div>
  \`;
};

export default ${name};
`;
}

/**
 * Generates a full-featured component
 * @param {string} name - Component name
 * @returns {string} Component code
 */
function generateFullComponent(name: string): string {
  return `/**
 * @fileoverview ${name} - Full-featured component with state, resources, and router
 */

import {
  html,
  Component,
  ComponentProps,
  createSignal,
  createEffect,
  createResource,
  createContext,
  useContext,
  useParams,
  useNavigate,
  Show,
  For,
  onMount,
  onUnmount,
} from '@fluixi/kettlejs';

/**
 * Props for ${name} component
 */
export interface ${name}Props extends ComponentProps {
  initialData?: ${name}Data[];
}

/**
 * Data interface for ${name}
 */
export interface ${name}Data {
  id: string | number;
  title: string;
  description: string;
  createdAt: string;
}

/**
 * ${name} context type
 */
interface ${name}Context {
  selectedId: () => string | null;
  selectItem: (id: string) => void;
}

/**
 * Context for ${name} component
 */
const ${name}Context = createContext<${name}Context | null>(null, '${name}Context');

/**
 * Fetches items for ${name}
 * @returns {Promise<${name}Data[]>} Fetched items
 */
async function fetch${name}Items(): Promise<${name}Data[]> {
  // Replace with your actual API call
  const response = await fetch('/api/${name.toLowerCase()}');

  if (!response.ok) {
    throw new Error('Failed to fetch items');
  }

  return response.json();
}

/**
 * ${name} component - Full-featured implementation
 * @param {${name}Props} props - Component props
 * @returns {TemplateResult} Rendered template
 *
 * @example
 * \`\`\`typescript
 * const App = () => {
 *   return html\`
 *     <div>
 *       \${${name}({ initialData: [] })}
 *     </div>
 *   \`;
 * };
 * \`\`\`
 */
export const ${name}: Component<${name}Props> = (props) => {
  const params = useParams();
  const navigate = useNavigate();

  // State
  const [selectedId, setSelectedId] = createSignal<string | null>(params.id || null);
  const [filter, setFilter] = createSignal('');
  const [sortBy, setSortBy] = createSignal<'title' | 'date'>('title');

  // Resource
  const [items, { refetch, mutate }] = createResource(
    fetch${name}Items,
    {
      initialValue: props.initialData || [],
      onError: (error) => console.error('Failed to load items:', error),
    }
  );

  // Computed filtered and sorted items
  const filteredItems = () => {
    const all = items() || [];
    const filterText = filter().toLowerCase();

    let filtered = all.filter(item =>
      item.title.toLowerCase().includes(filterText) ||
      item.description.toLowerCase().includes(filterText)
    );

    if (sortBy() === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filtered.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return filtered;
  };

  // Effects
  createEffect(() => {
    if (params.id) {
      setSelectedId(params.id);
    }
  });

  // Lifecycle
  onMount(() => {
    console.log('${name} mounted');
  });

  onUnmount(() => {
    console.log('${name} unmounted');
  });

  // Handlers
  const selectItem = (id: string) => {
    setSelectedId(id);
    navigate(\`/${name.toLowerCase()}/\${id}\`);
  };

  const addNewItem = async () => {
    // Optimistic update
    const newItem: ${name}Data = {
      id: Date.now(),
      title: 'New Item',
      description: 'New item description',
      createdAt: new Date().toISOString(),
    };

    mutate(prev => [...(prev || []), newItem]);

    // Sync with server
    try {
      await fetch('/api/${name.toLowerCase()}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      refetch();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const deleteItem = async (id: string | number) => {
    // Optimistic update
    mutate(prev => prev?.filter(item => item.id !== id));

    // Sync with server
    try {
      await fetch(\`/api/${name.toLowerCase()}/\${id}\`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete item:', error);
      refetch();
    }
  };

  // Context value
  const contextValue: ${name}Context = {
    selectedId,
    selectItem,
  };

  return html\`
    <div class="${name.toLowerCase()}">
      <div class="header">
        <h2>${name}</h2>
        <button @click=\${refetch}>Refresh</button>
        <button @click=\${addNewItem}>Add New</button>
      </div>

      <div class="controls">
        <input
          type="text"
          placeholder="Filter items..."
          .value=\${filter()}
          @input=\${(e: Event) => setFilter((e.target as HTMLInputElement).value)}
        />
        <select
          .value=\${sortBy()}
          @change=\${(e: Event) => setSortBy((e.target as HTMLSelectElement).value as any)}
        >
          <option value="title">Sort by Title</option>
          <option value="date">Sort by Date</option>
        </select>
      </div>

      \${Show({
        when: items.loading,
        children: html\`<div class="loading">Loading...</div>\`,
      })}

      \${Show({
        when: items.error,
        children: html\`
          <div class="error">
            <p>Error: \${items.error?.message}</p>
            <button @click=\${refetch}>Retry</button>
          </div>
        \`,
      })}

      \${Show({
        when: () => !items.loading && !items.error,
        children: html\`
          <div class="items">
            \${For({
              each: filteredItems,
              children: (item, index) => html\`
                <div
                  class=\${selectedId() === String(item.id) ? 'item selected' : 'item'}
                  @click=\${() => selectItem(String(item.id))}
                >
                  <h3>\${item.title}</h3>
                  <p>\${item.description}</p>
                  <span class="date">\${new Date(item.createdAt).toLocaleDateString()}</span>
                  <button
                    @click=\${(e: Event) => {
                      e.stopPropagation();
                      deleteItem(item.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              \`,
            })}
          </div>
        \`,
      })}

      \${Show({
        when: () => filteredItems().length === 0 && !items.loading,
        children: html\`<p class="empty">No items found</p>\`,
      })}
    </div>
  \`;
};

export default ${name};
`;
}

/**
 * Generates a JSX component
 */
function generateJSXComponent(
  name: string,
  type: ComponentType = 'basic'
): string {
  const kebabName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

  if (type === 'basic') {
    return `/** @jsx h */
import { h, Fragment } from '@fluixi/kettlejs/jsx-runtime';
import { createSignal } from '@fluixi/reactive/signal';
import './${kebabName}.css';

export interface ${name}Props {
  title?: string;
}

export function ${name}({ title = 'Hello' }: ${name}Props) {
  return (
    <div class="${kebabName}">
      <h1>{title}</h1>
      <p>This is a KettleJS JSX component</p>
    </div>
  );
}

export default ${name};
`;
  } else if (type === 'with-state') {
    return `/** @jsx h */
import { h, Fragment } from '@fluixi/kettlejs/jsx-runtime';
import { createSignal } from '@fluixi/reactive/signal';
import './${kebabName}.css';

export interface ${name}Props {
  initialCount?: number;
}

export function ${name}({ initialCount = 0 }: ${name}Props) {
  const [count, setCount] = createSignal(initialCount);

  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);
  const reset = () => setCount(initialCount);

  return (
    <div class="${kebabName}">
      <h2>Counter Component</h2>
      <div class="counter">
        <button onClick={decrement}>-</button>
        <span class="count">{count()}</span>
        <button onClick={increment}>+</button>
      </div>
      <button onClick={reset}>Reset</button>
    </div>
  );
}

export default ${name};
`;
  }

  return generateJSXComponent(name, 'basic');
}

/**
 * Generates a React Bridge component
 */
function generateReactBridgeComponent(
  name: string,
  type: ComponentType = 'basic'
): string {
  const kebabName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

  if (type === 'basic') {
    return `import React from 'react';
import { useSignal } from '@fluixi/kettlejs/react-bridge';
import './${kebabName}.css';

export interface ${name}Props {
  title?: string;
}

export function ${name}({ title = 'Hello' }: ${name}Props) {
  return (
    <div className="${kebabName}">
      <h1>{title}</h1>
      <p>This is a KettleJS React Bridge component</p>
    </div>
  );
}

export default ${name};
`;
  } else if (type === 'with-state') {
    return `import React from 'react';
import { useSignal, useKettleEffect } from '@fluixi/kettlejs/react-bridge';
import './${kebabName}.css';

export interface ${name}Props {
  initialCount?: number;
}

export function ${name}({ initialCount = 0 }: ${name}Props) {
  const [count, setCount] = useSignal(initialCount);

  useKettleEffect(() => {
    console.log('Count changed:', count());
  });

  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);
  const reset = () => setCount(initialCount);

  return (
    <div className="${kebabName}">
      <h2>Counter Component</h2>
      <div className="counter">
        <button onClick={decrement}>-</button>
        <span className="count">{count()}</span>
        <button onClick={increment}>+</button>
      </div>
      <button onClick={reset}>Reset</button>
    </div>
  );
}

export default ${name};
`;
  }

  return generateReactBridgeComponent(name, 'basic');
}

/**
 * Creates a component file
 * @param {string} componentPath - Path to create the component
 * @param {string} name - Component name
 * @param {ComponentType} type - Component type
 */
async function createComponent(
  componentPath: string,
  name: string,
  type: ComponentType = 'basic',
  pattern: ComponentPattern = 'functional',
  mode: ComponentMode = 'lit-html'
): Promise<void> {
  const componentDir = path.dirname(componentPath);

  // Ensure component directory exists
  await fs.mkdir(componentDir, { recursive: true });

  let componentCode: string;

  // Generate based on mode
  if (mode === 'jsx') {
    componentCode = generateJSXComponent(name, type);
  } else if (mode === 'react-bridge') {
    componentCode = generateReactBridgeComponent(name, type);
  } else {
    // lit-html mode (original generators)
    switch (type) {
      case 'basic':
        componentCode = generateBasicComponent(name, pattern);
        break;
      case 'with-state':
        componentCode = generateComponentWithState(name, pattern);
        break;
      case 'with-resource':
        componentCode = generateComponentWithResource(name, pattern);
        break;
      case 'with-router':
        componentCode = generateComponentWithRouter(name, pattern);
        break;
      case 'full':
        componentCode = generateFullComponent(name);
        break;
      default:
        componentCode = generateBasicComponent(name, pattern);
    }
  }

  // Write component file
  await fs.writeFile(componentPath, componentCode, 'utf-8');

  // Create test file
  const testPath = componentPath.replace(/\.tsx?$/, '.spec.ts');
  const testCode = generateTestFile(name);
  await fs.writeFile(testPath, testCode, 'utf-8');

  // Create style file
  const stylePath = componentPath.replace(/\.tsx?$/, '.css');
  const styleCode = generateStyleFile(name);
  await fs.writeFile(stylePath, styleCode, 'utf-8');

  console.log(chalk.green(`✓ Created component: ${name}`));
  console.log(chalk.gray(`  - ${componentPath}`));
  console.log(chalk.gray(`  - ${testPath}`));
  console.log(chalk.gray(`  - ${stylePath}`));
}

/**
 * Generates a test file for a component
 * @param {string} name - Component name
 * @returns {string} Test code
 */
function generateTestFile(name: string): string {
  return `/**
 * @fileoverview Tests for ${name} component
 */

import { describe, it, expect } from 'vitest';
import { render } from '@fluixi/kettlejs';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('should render successfully', () => {
    const container = document.createElement('div');
    const dispose = render(() => ${name}({}), container);

    expect(container.querySelector('.${name.toLowerCase()}')).toBeTruthy();

    dispose();
  });

  it('should display component title', () => {
    const container = document.createElement('div');
    const dispose = render(() => ${name}({}), container);

    const heading = container.querySelector('h2');
    expect(heading?.textContent).toBe('${name}');

    dispose();
  });
});
`;
}

/**
 * Generates a style file for a component
 * @param {string} name - Component name
 * @returns {string} CSS code
 */
function generateStyleFile(name: string): string {
  return `.${name.toLowerCase()} {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.${name.toLowerCase()} h2 {
  margin: 0 0 1rem 0;
  color: #333;
}

.${name.toLowerCase()} p {
  margin: 0.5rem 0;
  color: #666;
}

.${name.toLowerCase()} button {
  padding: 0.5rem 1rem;
  margin: 0.25rem;
  border: none;
  border-radius: 4px;
  background: #007bff;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
}

.${name.toLowerCase()} button:hover {
  background: #0056b3;
}

.${name.toLowerCase()} button:active {
  transform: scale(0.98);
}

.${name.toLowerCase()} .loading,
.${name.toLowerCase()} .error,
.${name.toLowerCase()} .empty {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.${name.toLowerCase()} .error {
  color: #dc3545;
}
`;
}

/**
 * Interactive component generation
 */
async function interactiveComponentGeneration(): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Component name:',
      validate: (input: string) => {
        if (!input) return 'Component name is required';
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
          return 'Component name must start with uppercase letter';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'mode',
      message: 'Component mode:',
      choices: [
        {
          name: 'Lit-HTML (Recommended - native KettleJS with lit-html)',
          value: 'lit-html',
        },
        {
          name: 'JSX (Native JSX runtime for KettleJS)',
          value: 'jsx',
        },
        {
          name: 'React Bridge (React compatibility with KettleJS signals)',
          value: 'react-bridge',
        },
      ],
      default: 'lit-html',
    },
    {
      type: 'list',
      name: 'pattern',
      message: 'Component pattern:',
      choices: [
        {
          name: 'KettleElement (Recommended - extends KettleElement base class)',
          value: 'kettlelement',
        },
        {
          name: 'LitElement (Plain LitElement class component)',
          value: 'litelement',
        },
        {
          name: 'WithSignals (Mixin - adds signals to LitElement)',
          value: 'withsignals',
        },
        {
          name: 'Controller (Manual - uses SignalController)',
          value: 'controller',
        },
        {
          name: 'Functional (Function-based component)',
          value: 'functional',
        },
      ],
      default: 'kettlelement',
      when: (answers: any) => answers.mode === 'lit-html',
    },
    {
      type: 'list',
      name: 'type',
      message: 'Component features:',
      choices: [
        { name: 'Basic (Simple component)', value: 'basic' },
        { name: 'With State (Reactive state management)', value: 'with-state' },
        { name: 'With Resource (Async data fetching)', value: 'with-resource' },
        { name: 'With Router (Router integration)', value: 'with-router' },
        { name: 'Full (All features)', value: 'full' },
      ],
    },
    {
      type: 'input',
      name: 'path',
      message: 'Component path (relative to src):',
      default: (answers: any) => {
        const ext = answers.mode === 'lit-html' ? 'ts' : 'tsx';
        return `components/${answers.name}/${answers.name}.${ext}`;
      },
    },
  ]);

  const componentPath = path.join(process.cwd(), 'src', answers.path);
  await createComponent(
    componentPath,
    answers.name,
    answers.type,
    answers.pattern || 'functional',
    answers.mode || 'lit-html'
  );
}

/**
 * Generates project structure
 * @param {string} projectName - Project name
 * @param {ProjectTemplate} template - Template type
 * @param {ComponentMode} mode - Default component mode
 * @param {any} config - Advanced configuration options
 */
async function generateProject(
  projectName: string,
  template: ProjectTemplate,
  mode: ComponentMode = 'lit-html',
  config: any = {}
): Promise<void> {
  const projectPath = path.join(process.cwd(), projectName);

  console.log(chalk.blue(`\nCreating KettleJS project: ${projectName}`));
  console.log(chalk.gray(`Template: ${template}\n`));

  // Create project directory
  await fs.ensureDir(projectPath);

  // Create directory structure
  await fs.ensureDir(path.join(projectPath, 'src'));
  await fs.ensureDir(path.join(projectPath, 'src/components'));
  await fs.ensureDir(path.join(projectPath, 'src/pages'));
  await fs.ensureDir(path.join(projectPath, 'src/styles'));
  await fs.ensureDir(path.join(projectPath, 'public'));

  // Generate package.json with conditional dependencies based on mode
  const packageJson: any = {
    name: projectName,
    version: '0.0.1',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
      test: 'vitest',
    },
    dependencies: {
      '@fluixi/kettlejs': 'workspace:*',
      '@fluixi/reactive': 'workspace:*',
      lit: '^3.3.1',
    },
    devDependencies: {
      typescript: '^5.0.0',
      vite: '^5.0.0',
      vitest: '^1.0.0',
    },
  };

  // Add React dependencies if using react-bridge mode
  if (mode === 'react-bridge') {
    packageJson.dependencies.react = '^18.0.0';
    packageJson.dependencies['react-dom'] = '^18.0.0';
    packageJson.devDependencies['@types/react'] = '^18.0.0';
    packageJson.devDependencies['@types/react-dom'] = '^18.0.0';
  }

  // Add advanced configuration dependencies
  if (config.cssPreprocessor === 'scss') {
    packageJson.devDependencies.sass = '^1.69.0';
  } else if (config.cssPreprocessor === 'less') {
    packageJson.devDependencies.less = '^4.2.0';
  } else if (config.cssPreprocessor === 'postcss') {
    packageJson.devDependencies.postcss = '^8.4.31';
    packageJson.devDependencies.autoprefixer = '^10.4.16';
  }

  if (config.includeESLint) {
    packageJson.devDependencies.eslint = '^8.53.0';
    packageJson.devDependencies['@typescript-eslint/eslint-plugin'] = '^6.10.0';
    packageJson.devDependencies['@typescript-eslint/parser'] = '^6.10.0';
    packageJson.scripts.lint = 'eslint src --ext ts,tsx';
  }

  if (config.includePrettier) {
    packageJson.devDependencies.prettier = '^3.1.0';
    packageJson.scripts.format = 'prettier --write "src/**/*.{ts,tsx,css}"';
  }

  if (config.includeSSR) {
    packageJson.dependencies['@lit-labs/ssr'] = '^3.3.1';
    packageJson.dependencies['@lit-labs/ssr-client'] = '^1.1.7';
  }

  if (config.author) {
    packageJson.author = config.author;
  }

  if (config.description) {
    packageJson.description = config.description;
  }

  if (config.license) {
    packageJson.license = config.license;
  }

  await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, {
    spaces: 2,
  });

  // Generate tsconfig.json with conditional JSX settings
  const tsConfig: any = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      moduleResolution: 'bundler',
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    include: ['src'],
  };

  // Configure JSX based on mode
  if (mode === 'jsx') {
    tsConfig.compilerOptions.jsx = 'react-jsx';
    tsConfig.compilerOptions.jsxImportSource = '@fluixi/kettlejs/jsx-runtime';
  } else if (mode === 'react-bridge') {
    tsConfig.compilerOptions.jsx = 'react-jsx';
  } else {
    tsConfig.compilerOptions.jsx = 'preserve';
  }

  await fs.writeJSON(path.join(projectPath, 'tsconfig.json'), tsConfig, {
    spaces: 2,
  });

  // Generate vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
});
`;

  await fs.writeFile(path.join(projectPath, 'vite.config.ts'), viteConfig);

  // Generate index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;

  await fs.writeFile(path.join(projectPath, 'index.html'), indexHtml);

  // Generate main.ts based on mode
  let mainTs: string;
  const appExt = mode === 'lit-html' ? 'ts' : 'tsx';

  if (mode === 'jsx') {
    mainTs = `import { render } from '@fluixi/kettlejs';
import { App } from './App';
import './styles/main.css';

const root = document.getElementById('app');

if (root) {
  render(App, root);
}
`;
  } else if (mode === 'react-bridge') {
    mainTs = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/main.css';

const root = document.getElementById('app');

if (root) {
  const reactRoot = createRoot(root);
  reactRoot.render(<App />);
}
`;
  } else {
    mainTs = `import { render, html } from '@fluixi/kettlejs';
import { App } from './App';
import './styles/main.css';

const root = document.getElementById('app');

if (root) {
  render(App, root);
}
`;
  }

  await fs.writeFile(path.join(projectPath, 'src/main.ts'), mainTs);

  // Generate App component based on mode
  const appTs = generateAppComponent(template, mode);
  await fs.writeFile(path.join(projectPath, `src/App.${appExt}`), appTs);

  // Generate example components if requested
  if (config.exampleComponents && config.exampleComponents.length > 0) {
    console.log(chalk.blue('\nGenerating example components...'));

    for (const component of config.exampleComponents) {
      await generateExampleComponent(projectPath, component, mode);
    }
  }

  // Generate example pages if requested
  if (config.examplePages && config.examplePages.length > 0) {
    console.log(chalk.blue('\nGenerating example pages...'));

    for (const page of config.examplePages) {
      await generateExamplePage(projectPath, page, mode);
    }
  }

  // Generate ESLint config
  if (config.includeESLint) {
    const eslintConfig = {
      parser: '@typescript-eslint/parser',
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      rules: {},
    };
    await fs.writeJSON(path.join(projectPath, '.eslintrc.json'), eslintConfig, {
      spaces: 2,
    });
  }

  // Generate Prettier config
  if (config.includePrettier) {
    const prettierConfig = {
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2,
    };
    await fs.writeJSON(
      path.join(projectPath, '.prettierrc.json'),
      prettierConfig,
      {
        spaces: 2,
      }
    );
  }

  // Generate main.css
  const mainCss = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
`;

  await fs.writeFile(path.join(projectPath, 'src/styles/main.css'), mainCss);

  // Generate README
  const readme = `# ${projectName}

A KettleJS application.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── styles/         # Global styles
│   ├── App.ts          # Root component
│   └── main.ts         # Application entry point
├── public/             # Static assets
├── index.html          # HTML template
├── package.json
├── tsconfig.json
└── vite.config.ts
\`\`\`

## Learn More

- [KettleJS Documentation](https://github.com/your-org/kettlejs)
- [Lit Documentation](https://lit.dev)
`;

  await fs.writeFile(path.join(projectPath, 'README.md'), readme);

  console.log(chalk.green(`\n✓ Project created successfully!\n`));
  console.log(chalk.blue('Next steps:'));
  console.log(chalk.gray(`  cd ${projectName}`));
  console.log(chalk.gray(`  npm install`));
  console.log(chalk.gray(`  npm run dev\n`));
}

/**
 * Generates the main App component
 * @param {ProjectTemplate} template - Template type
 * @param {ComponentMode} mode - Component mode
 * @returns {string} Component code
 */
function generateAppComponent(
  template: ProjectTemplate,
  mode: ComponentMode = 'lit-html'
): string {
  if (mode === 'jsx') {
    return generateJSXAppComponent(template);
  } else if (mode === 'react-bridge') {
    return generateReactBridgeAppComponent(template);
  }

  // Default lit-html mode
  if (template === 'full') {
    return `import { html, createRouter, Router, Link, Component } from '@fluixi/kettlejs';

const Home = () => html\`
  <div>
    <h1>Home Page</h1>
    <p>Welcome to your KettleJS application!</p>
  </div>
\`;

const About = () => html\`
  <div>
    <h1>About Page</h1>
    <p>This is a full-featured KettleJS application.</p>
  </div>
\`;

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
];

export const App: Component = () => {
  const router = createRouter(routes);

  return Router({
    router,
    children: html\`
      <div class="app">
        <nav>
          \${Link({ href: '/', children: 'Home' })}
          \${Link({ href: '/about', children: 'About' })}
        </nav>
        <main id="content"></main>
      </div>
    \`,
  });
};
`;
  }

  return `import { html, createSignal, Component } from '@fluixi/kettlejs';

export const App: Component = () => {
  const [count, setCount] = createSignal(0);

  return html\`
    <div class="app">
      <h1>Welcome to KettleJS</h1>
      <p>A reactive framework for lit-html</p>
      <div class="counter">
        <p>Count: \${count()}</p>
        <button @click=\${() => setCount(count() + 1)}>Increment</button>
      </div>
    </div>
  \`;
};
export default App;
`;
}

/**
 * Generates JSX App component
 */
function generateJSXAppComponent(template: ProjectTemplate): string {
  return `/** @jsx h */
import { h, Fragment } from '@fluixi/kettlejs/jsx-runtime';
import { createSignal } from '@fluixi/reactive/signal';
import './styles/main.css';

export function App() {
  const [count, setCount] = createSignal(0);

  return (
    <div class="app">
      <header>
        <h1>Welcome to KettleJS</h1>
        <p>A reactive framework powered by signals</p>
      </header>

      <main>
        <div class="counter">
          <h2>Counter Example</h2>
          <div class="controls">
            <button onClick={() => setCount(count() - 1)}>-</button>
            <span class="count">{count()}</span>
            <button onClick={() => setCount(count() + 1)}>+</button>
          </div>
        </div>
      </main>

      <footer>
        <p>Built with KettleJS JSX</p>
      </footer>
    </div>
  );
}

export default App;
`;
}

/**
 * Generates React Bridge App component
 */
function generateReactBridgeAppComponent(template: ProjectTemplate): string {
  return `import React from 'react';
import { useSignal, useKettleEffect } from '@fluixi/kettlejs/react-bridge';
import './styles/main.css';

export function App() {
  const [count, setCount] = useSignal(0);

  useKettleEffect(() => {
    console.log('Count changed:', count());
  });

  return (
    <div className="app">
      <header>
        <h1>Welcome to KettleJS</h1>
        <p>A reactive framework with React compatibility</p>
      </header>

      <main>
        <div className="counter">
          <h2>Counter Example</h2>
          <div className="controls">
            <button onClick={() => setCount(count() - 1)}>-</button>
            <span className="count">{count()}</span>
            <button onClick={() => setCount(count() + 1)}>+</button>
          </div>
        </div>
      </main>

      <footer>
        <p>Built with KettleJS React Bridge</p>
      </footer>
    </div>
  );
}

export default App;
`;
}

/**
 * Generate example component
 */
async function generateExampleComponent(
  projectPath: string,
  componentName: string,
  mode: ComponentMode
): Promise<void> {
  const componentDir = path.join(projectPath, 'src/components', componentName);
  await fs.ensureDir(componentDir);

  const ext = mode === 'lit-html' ? 'ts' : 'tsx';
  const componentPath = path.join(componentDir, `${componentName}.${ext}`);

  let componentCode = '';

  if (componentName === 'counter') {
    componentCode =
      mode === 'jsx'
        ? generateJSXComponent('Counter', 'with-state')
        : mode === 'react-bridge'
        ? generateReactBridgeComponent('Counter', 'with-state')
        : generateComponentWithState('Counter', 'functional');
  } else if (componentName === 'todolist') {
    componentCode = generateTodoListComponent(mode);
  } else if (componentName === 'usercard') {
    componentCode = generateUserCardComponent(mode);
  } else if (componentName === 'datafetcher') {
    componentCode = generateDataFetcherComponent(mode);
  }

  await fs.writeFile(componentPath, componentCode);

  // Generate CSS
  const cssPath = path.join(componentDir, `${componentName}.css`);
  await fs.writeFile(cssPath, generateStyleFile(componentName));

  console.log(chalk.gray(`  ✓ ${componentName} component created`));
}

/**
 * Generate example page
 */
async function generateExamplePage(
  projectPath: string,
  pageName: string,
  mode: ComponentMode
): Promise<void> {
  const pageDir = path.join(projectPath, 'src/pages', pageName);
  await fs.ensureDir(pageDir);

  const ext = mode === 'lit-html' ? 'ts' : 'tsx';
  const pagePath = path.join(pageDir, `${pageName}.${ext}`);

  let pageCode = '';

  if (mode === 'jsx') {
    pageCode = `/** @jsx h */
import { h } from '@fluixi/kettlejs/jsx-runtime';
import './${pageName}.css';

export function ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Page() {
  return (
    <div class="${pageName}-page">
      <h1>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page</h1>
      <p>Welcome to the ${pageName} page.</p>
    </div>
  );
}

export default ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Page;
`;
  } else if (mode === 'react-bridge') {
    pageCode = `import React from 'react';
import './${pageName}.css';

export function ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Page() {
  return (
    <div className="${pageName}-page">
      <h1>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page</h1>
      <p>Welcome to the ${pageName} page.</p>
    </div>
  );
}

export default ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Page;
`;
  } else {
    pageCode = `import { html } from 'lit';
import './${pageName}.css';

export const ${
      pageName.charAt(0).toUpperCase() + pageName.slice(1)
    }Page = () => html\`
  <div class="${pageName}-page">
    <h1>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page</h1>
    <p>Welcome to the ${pageName} page.</p>
  </div>
\`;

export default ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Page;
`;
  }

  await fs.writeFile(pagePath, pageCode);

  // Generate CSS
  const cssPath = path.join(pageDir, `${pageName}.css`);
  await fs.writeFile(cssPath, `.${pageName}-page { padding: 2rem; }`);

  console.log(chalk.gray(`  ✓ ${pageName} page created`));
}

/**
 * Generate TodoList component
 */
function generateTodoListComponent(mode: ComponentMode): string {
  if (mode === 'jsx') {
    return `/** @jsx h */
import { h } from '@fluixi/kettlejs/jsx-runtime';
import { createSignal } from '@fluixi/reactive/signal';
import './todolist.css';

export function TodoList() {
  const [todos, setTodos] = createSignal<string[]>([]);
  const [input, setInput] = createSignal('');

  const addTodo = () => {
    if (input().trim()) {
      setTodos([...todos(), input()]);
      setInput('');
    }
  };

  return (
    <div class="todolist">
      <h2>Todo List</h2>
      <div class="input-group">
        <input
          type="text"
          value={input()}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder="Add a todo..."
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul>
        {todos().map((todo, index) => (
          <li key={index}>{todo}</li>
        ))}
      </ul>
    </div>
  );
}

export default TodoList;
`;
  }

  return `import { html } from 'lit';
import { createSignal } from '@fluixi/reactive/signal';
import './todolist.css';

export const TodoList = () => {
  const [todos, setTodos] = createSignal<string[]>([]);
  const [input, setInput] = createSignal('');

  const addTodo = () => {
    if (input().trim()) {
      setTodos([...todos(), input()]);
      setInput('');
    }
  };

  return html\`
    <div class="todolist">
      <h2>Todo List</h2>
      <div class="input-group">
        <input
          type="text"
          .value=\${input()}
          @input=\${(e: Event) => setInput((e.target as HTMLInputElement).value)}
          placeholder="Add a todo..."
        />
        <button @click=\${addTodo}>Add</button>
      </div>
      <ul>
        \${todos().map((todo) => html\`<li>\${todo}</li>\`)}
      </ul>
    </div>
  \`;
};

export default TodoList;
`;
}

/**
 * Generate UserCard component
 */
function generateUserCardComponent(mode: ComponentMode): string {
  if (mode === 'jsx') {
    return `/** @jsx h */
import { h } from '@fluixi/kettlejs/jsx-runtime';
import './usercard.css';

export interface UserCardProps {
  name: string;
  email: string;
  avatar?: string;
}

export function UserCard({ name, email, avatar }: UserCardProps) {
  return (
    <div class="usercard">
      <img src={avatar || 'https://via.placeholder.com/100'} alt={name} />
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  );
}

export default UserCard;
`;
  }

  return `import { html } from 'lit';
import './usercard.css';

export interface UserCardProps {
  name: string;
  email: string;
  avatar?: string;
}

export const UserCard = (props: UserCardProps) => html\`
  <div class="usercard">
    <img src="\${props.avatar || 'https://via.placeholder.com/100'}" alt="\${props.name}" />
    <h3>\${props.name}</h3>
    <p>\${props.email}</p>
  </div>
\`;

export default UserCard;
`;
}

/**
 * Generate DataFetcher component
 */
function generateDataFetcherComponent(mode: ComponentMode): string {
  return `import { html } from 'lit';
import { createResource } from '@fluixi/kettlejs/resources';
import { Show } from '@fluixi/kettlejs/control-flow';
import './datafetcher.css';

async function fetchData() {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
  return response.json();
}

export const DataFetcher = () => {
  const [data] = createResource(fetchData);

  return html\`
    <div class="datafetcher">
      <h2>Data Fetcher</h2>
      \${Show({
        when: () => data.loading,
        children: html\`<p>Loading...</p>\`,
      })}
      \${Show({
        when: () => data.error,
        children: html\`<p>Error: \${data.error?.message}</p>\`,
      })}
      \${Show({
        when: () => data(),
        children: html\`
          <div>
            <h3>\${data()?.title}</h3>
            <p>\${data()?.body}</p>
          </div>
        \`,
      })}
    </div>
  \`;
};

export default DataFetcher;
`;
}

/**
 * Interactive project generation
 */
async function interactiveProjectGeneration(): Promise<void> {
  const initialAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      validate: (input: string) => {
        if (!input) return 'Project name is required';
        if (!/^[a-z][a-z0-9-]*$/.test(input)) {
          return 'Project name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'template',
      message: 'Project template:',
      choices: [
        { name: 'Minimal (Basic setup)', value: 'minimal' },
        { name: 'Standard (With router and examples)', value: 'standard' },
        { name: 'Full (Complete setup with all features)', value: 'full' },
      ],
    },
    {
      type: 'list',
      name: 'mode',
      message: 'Default component mode:',
      choices: [
        { name: 'Lit-HTML (Native KettleJS)', value: 'lit-html' },
        { name: 'JSX (Native JSX runtime)', value: 'jsx' },
        { name: 'React Bridge (React compatibility)', value: 'react-bridge' },
      ],
      default: 'lit-html',
    },
    {
      type: 'confirm',
      name: 'advancedConfig',
      message: 'Configure advanced project settings?',
      default: false,
    },
  ]);

  let finalAnswers = { ...initialAnswers };

  // Advanced configuration
  if (initialAnswers.advancedConfig) {
    const advancedAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'includeRouter',
        message: 'Include router setup?',
        default: initialAnswers.template !== 'minimal',
      },
      {
        type: 'confirm',
        name: 'includeSSR',
        message: 'Include Server-Side Rendering (SSR) support?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'includeStateManagement',
        message: 'Include state management utilities?',
        default: initialAnswers.template === 'full',
      },
      {
        type: 'confirm',
        name: 'includeTesting',
        message: 'Setup testing framework (Vitest)?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'includeESLint',
        message: 'Include ESLint configuration?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'includePrettier',
        message: 'Include Prettier configuration?',
        default: true,
      },
      {
        type: 'list',
        name: 'cssPreprocessor',
        message: 'CSS preprocessor:',
        choices: [
          { name: 'None (Plain CSS)', value: 'none' },
          { name: 'SCSS/SASS', value: 'scss' },
          { name: 'Less', value: 'less' },
          { name: 'PostCSS', value: 'postcss' },
        ],
        default: 'none',
      },
      {
        type: 'checkbox',
        name: 'exampleComponents',
        message: 'Generate example components:',
        choices: [
          {
            name: 'Counter (Basic state management)',
            value: 'counter',
            checked: true,
          },
          { name: 'TodoList (CRUD operations)', value: 'todolist' },
          { name: 'UserCard (Props & styling)', value: 'usercard' },
          { name: 'DataFetcher (Async resources)', value: 'datafetcher' },
        ],
      },
      {
        type: 'checkbox',
        name: 'examplePages',
        message: 'Generate example pages:',
        choices: [
          { name: 'Home', value: 'home', checked: true },
          { name: 'About', value: 'about' },
          { name: 'Dashboard', value: 'dashboard' },
          { name: 'NotFound (404)', value: 'notfound', checked: true },
        ],
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author name (optional):',
        default: '',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description (optional):',
        default: 'A KettleJS application',
      },
      {
        type: 'input',
        name: 'license',
        message: 'License:',
        default: 'MIT',
      },
    ]);

    finalAnswers = { ...finalAnswers, ...advancedAnswers };
  }

  await generateProject(
    finalAnswers.name,
    finalAnswers.template,
    finalAnswers.mode,
    finalAnswers
  );

  console.log(chalk.yellow('\nNote: Component mode preference saved.'));
  console.log(chalk.gray(`Default mode: ${finalAnswers.mode}`));
}

// CLI Commands
program
  .name('kettlejs')
  .description('KettleJS CLI - Generate projects and components')
  .version(VERSION);

program
  .command('new [project-name]')
  .description('Create a new KettleJS project')
  .option(
    '-t, --template <template>',
    'Project template (minimal|standard|full)',
    'standard'
  )
  .action(
    async (projectName?: string, options?: { template: ProjectTemplate }) => {
      try {
        if (projectName) {
          await generateProject(projectName, options?.template || 'standard');
        } else {
          await interactiveProjectGeneration();
        }
      } catch (error) {
        console.error(chalk.red('Error creating project:'), error);
        process.exit(1);
      }
    }
  );

program
  .command('generate <type> [name]')
  .alias('g')
  .description('Generate a component or other artifact')
  .option(
    '-t, --type <type>',
    'Component type (basic|with-state|with-resource|with-router|full)'
  )
  .option('-p, --path <path>', 'Component path')
  .option('-m, --mode <mode>', 'Component mode (lit-html|jsx|react-bridge)')
  .action(
    async (
      type: string,
      name?: string,
      options?: { type?: ComponentType; path?: string; mode?: ComponentMode }
    ) => {
      try {
        if (type === 'component' || type === 'c') {
          if (name && options?.path) {
            const componentType = options.type || 'basic';
            const componentMode = options.mode || 'lit-html';
            const componentPath = path.join(process.cwd(), 'src', options.path);
            await createComponent(
              componentPath,
              name,
              componentType,
              'functional',
              componentMode
            );
          } else {
            await interactiveComponentGeneration();
          }
        } else {
          console.error(chalk.red(`Unknown type: ${type}`));
          console.log(chalk.gray('Available types: component (or c)'));
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red('Error generating component:'), error);
        process.exit(1);
      }
    }
  );

program
  .command('info')
  .description('Display KettleJS information')
  .action(() => {
    console.log(chalk.blue('\n╔═══════════════════════════════════╗'));
    console.log(chalk.blue('║         KettleJS CLI v' + VERSION + '        ║'));
    console.log(chalk.blue('╚═══════════════════════════════════╝\n'));
    console.log(chalk.gray('A reactive framework for lit-html\n'));
    console.log('Commands:');
    console.log(
      chalk.cyan('  new [project-name]      ') + 'Create a new project'
    );
    console.log(
      chalk.cyan('  generate <type> [name]  ') + 'Generate a component'
    );
    console.log(
      chalk.cyan('  info                    ') + 'Show this information'
    );
    console.log(chalk.cyan('  help                    ') + 'Show help\n');
    console.log('Examples:');
    console.log(chalk.gray('  kettlejs new my-app'));
    console.log(chalk.gray('  kettlejs generate component MyComponent'));
    console.log(
      chalk.gray('  kettlejs generate component MyComponent --mode jsx')
    );
    console.log(
      chalk.gray(
        '  kettlejs generate component MyComponent --mode react-bridge'
      )
    );
    console.log(
      chalk.gray(
        '  kettlejs g c MyComponent -t with-state -p components/MyComponent/MyComponent.ts\n'
      )
    );
  });

// Parse CLI arguments
program.parse();
