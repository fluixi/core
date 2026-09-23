/**
 * What `Can` and `Protect` return, which is what both authoring styles consume.
 *
 * They were typed to return `unknown`, so JSX refused them: a component you cannot put in
 * a template is not a component. The fix was the type, and these pin the contract behind
 * it rather than the type itself.
 *
 * Neither JSX nor `html` is exercised here, because no package in this repo unit-tests
 * either: both compile to the same runtime call, and a component is inserted by its
 * return value. A thunk is what `Show` returns too, so anything that renders `Show`
 * renders these.
 */
import { describe, expect, it } from 'vitest';
import { createAuthHooks } from './client.js';

interface User {
  name: string;
  role: string;
}

function hooksFor(user: User | null) {
  return createAuthHooks<User, { manage: boolean }>({
    session: {
      user: () => user,
      roles: () => (user ? [user.role] : []),
      can: (query) =>
        typeof query === 'function' ? query({ manage: user?.role === 'admin' }) : false,
    },
  });
}

describe('what a guard hands back', () => {
  it('is a thunk, as the control flow components are', () => {
    const { Can, Protect } = hooksFor({ name: 'ada', role: 'admin' });
    // The runtime calls a function child reactively, which is how a guard re-renders
    // when a role changes without the page reloading.
    expect(typeof Can({ perform: () => true, children: 'x' })).toBe('function');
    expect(typeof Protect({ roles: ['admin'], children: 'x' })).toBe('function');
  });
});

describe('Can', () => {
  it('yields its children when the permission holds', () => {
    const { Can } = hooksFor({ name: 'ada', role: 'admin' });
    expect(Can({ perform: (p) => p.manage, children: 'allowed', fallback: 'denied' })()).toBe(
      'allowed',
    );
  });

  it('yields the fallback when it does not', () => {
    const { Can } = hooksFor({ name: 'sam', role: 'viewer' });
    expect(Can({ perform: (p) => p.manage, children: 'allowed', fallback: 'denied' })()).toBe(
      'denied',
    );
  });

  it('yields null rather than undefined with no fallback', () => {
    const { Can } = hooksFor({ name: 'sam', role: 'viewer' });
    // `undefined` renders as nothing in one path and as the word in another, so the
    // absent case is made explicit here instead.
    expect(Can({ perform: (p) => p.manage, children: 'allowed' })()).toBeNull();
  });

  it('re-reads the session each time, so a role change shows without a reload', () => {
    let role = 'viewer';
    const hooks = createAuthHooks<User, { manage: boolean }>({
      session: {
        user: () => ({ name: 'ada', role }),
        roles: () => [role],
        can: (query) => (typeof query === 'function' ? query({ manage: role === 'admin' }) : false),
      },
    });
    const view = hooks.Can({ perform: (p) => p.manage, children: 'allowed', fallback: 'denied' });

    expect(view()).toBe('denied');
    role = 'admin';
    expect(view()).toBe('allowed');
  });
});

describe('Protect', () => {
  it('yields its children for a role that passes', () => {
    const { Protect } = hooksFor({ name: 'ada', role: 'admin' });
    expect(
      Protect({ roles: ['admin', 'superadmin'], children: 'zone', fallback: 'hidden' })(),
    ).toBe('zone');
  });

  it('yields the fallback for a role that does not', () => {
    const { Protect } = hooksFor({ name: 'sam', role: 'viewer' });
    expect(Protect({ roles: ['admin'], children: 'zone', fallback: 'hidden' })()).toBe('hidden');
  });

  it('yields the fallback for a visitor who is not signed in', () => {
    const { Protect } = hooksFor(null);
    // Not merely a failing role check: there is nobody to check.
    expect(Protect({ roles: ['admin'], children: 'zone', fallback: 'hidden' })()).toBe('hidden');
  });

  it('accepts a single role as well as a list', () => {
    const { Protect } = hooksFor({ name: 'ada', role: 'admin' });
    expect(Protect({ role: 'admin', children: 'zone', fallback: 'hidden' })()).toBe('zone');
    expect(Protect({ role: 'superadmin', children: 'zone', fallback: 'hidden' })()).toBe('hidden');
  });

  it('shows a section to anyone signed in when no role is named', () => {
    const { Protect } = hooksFor({ name: 'sam', role: 'viewer' });
    expect(Protect({ children: 'zone', fallback: 'hidden' })()).toBe('zone');
  });
});
