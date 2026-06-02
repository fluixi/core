/**
 * @fileoverview KettleController — ReactiveController for existing Lit elements
 * @module @fluixi/element/controller
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  createRoot,
  createSignal,
  createEffect,
  createMemo,
  onCleanup,
  getOwner,
  runWithOwner,
} from '@fluixi/reactive/signal';
import { ensureElementIntegration } from './base.js';

type Owner = any;

export class KettleController implements ReactiveController {
  private __host: ReactiveControllerHost;
  private __dispose: (() => void) | null = null;
  private __owner: Owner = null;
  private __connected = false;

  constructor(host: ReactiveControllerHost) {
    this.__host = host;
    host.addController(this);
  }

  hostConnected(): void {
    if (this.__connected) return;
    this.__connected = true;
    ensureElementIntegration();

    createRoot((dispose) => {
      this.__dispose = dispose;
      this.__owner = getOwner();
    });
  }

  hostDisconnected(): void {
    if (this.__dispose) {
      this.__dispose();
      this.__dispose = null;
      this.__owner = null;
    }
    this.__connected = false;
  }

  signal<T>(initialValue: T): [() => T, (v: T | ((prev: T) => T)) => void] {
    if (!this.__owner) {
      throw new Error('KettleController: cannot create signal before hostConnected');
    }

    let tuple!: [() => T, (v: T | ((prev: T) => T)) => void];

    runWithOwner(this.__owner, () => {
      const [get, set] = createSignal(initialValue);
      const wrappedSet = (v: T | ((prev: T) => T)) => {
        set(v as any);
        this.__host.requestUpdate();
      };
      tuple = [get, wrappedSet];
    });

    return tuple;
  }

  memo<T>(fn: () => T): () => T {
    if (!this.__owner) {
      throw new Error('KettleController: cannot create memo before hostConnected');
    }

    let accessor!: () => T;
    runWithOwner(this.__owner, () => {
      accessor = createMemo(fn);
    });
    return accessor;
  }

  effect(fn: () => void | (() => void)): void {
    if (!this.__owner) {
      throw new Error('KettleController: cannot create effect before hostConnected');
    }

    runWithOwner(this.__owner, () => {
      let cleanup: (() => void) | void;
      createEffect(() => {
        if (cleanup) cleanup();
        cleanup = fn();
      });
      onCleanup(() => {
        if (cleanup) cleanup();
      });
    });
  }
}
