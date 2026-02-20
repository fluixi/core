---
title: Table of Contents
sidebar_position: 0
---

# KettleJS Framework - Complete Table of Contents

## 📖 Getting Started

### Installation & Setup
- **[Installation Guide](./getting-started/installation.md)**
  - Prerequisites
  - Quick Install (npm, yarn, pnpm)
  - Create New Project
  - Project Templates
  - Manual Setup
  - IDE Setup (VS Code, WebStorm)
  - TypeScript Configuration
  - Troubleshooting

- **[Quick Start Tutorial](./getting-started/quick-start.md)**
  - Your First KettleJS App
  - Building a Todo Application
  - Key Concepts Demonstrated
  - Adding More Features
  - Common Patterns
  - Next Steps

## 🎯 Core Concepts

### Reactive Primitives
- **[Signals](./core-concepts/signals.md)**
  - What is a Signal?
  - Creating Signals
  - Reading Signals
  - Updating Signals
  - Signal Options
  - Reactive Context
  - Signal Patterns
  - Performance Considerations
  - Common Pitfalls
  - Advanced Patterns

- **[Effects](./core-concepts/effects.md)**
  - What is an Effect?
  - Creating Effects
  - Effect Lifecycle
  - Common Use Cases
  - Advanced Patterns
  - Effect vs Memo
  - Best Practices
  - Component Integration
  - Debugging Effects
  - Common Pitfalls

- **Memos** (Planned)
  - Computed Values
  - Memoization
  - Performance

- **Batching** (Planned)
  - Batch Updates
  - Performance Optimization

- **Lifecycle** (Planned)
  - onMount
  - onUnmount
  - onCleanup

## 🧩 Components

- **[Components Overview](./components/overview.md)**
  - Component Patterns
  - Functional Components
  - KettleElement Base Class
  - WithSignals Mixin
  - Reactive Controllers
  - Pattern Comparison
  - Choosing a Pattern
  - Component Communication
  - Lifecycle
  - Styling Components
  - Best Practices

- **Functional Components** (Planned)
  - Creating Functions
  - Props
  - Composition

- **KettleElement** (Planned)
  - Custom Elements
  - Properties
  - Lifecycle Hooks

- **WithSignals Mixin** (Planned)
  - Mixing with Lit
  - Migration Strategy

- **Reactive Controllers** (Planned)
  - Advanced Control
  - Custom Controllers

## 🔀 Control Flow

- **[Show Component](./control-flow/show.md)**
  - Conditional Rendering
  - Basic Usage
  - Advanced Usage
  - Type-Safe Value Access
  - Patterns
  - Performance
  - Comparison with Alternatives

- **For Component** (Planned)
  - List Rendering
  - Keyed Reconciliation
  - Performance

- **Index Component** (Planned)
  - Non-Keyed Lists
  - Use Cases

- **Switch/Match** (Planned)
  - Multiple Conditions
  - Pattern Matching

- **Portal** (Planned)
  - Render Outside Hierarchy
  - Modal Dialogs

- **Dynamic** (Planned)
  - Dynamic Components
  - Lazy Loading

## 📚 API Reference

- **[Core API](./api-reference/core.md)**
  - Signals
    - createSignal
  - Effects
    - createEffect
    - onCleanup
  - Memos
    - createMemo
  - Components
    - createComponent
    - render
  - Lifecycle
    - onMount
    - onUnmount
  - Batching
    - batch
  - Tracking
    - untrack
  - Ownership
    - getOwner
    - runWithOwner
    - createRoot
  - Props Utilities
    - mergeProps
    - splitProps
  - Types
  - Constants

- **Control Flow API** (Planned)
  - Show, For, Index, Switch, Match, Portal, Dynamic

- **Context API** (Planned)
  - createContext, useContext, Provider

- **Router API** (Planned)
  - createRouter, Router, Link, useNavigate, useParams

- **Resources API** (Planned)
  - createResource, createResources

- **Directives API** (Planned)
  - ref, signal, Lit directives

## 📘 Comprehensive Guides

- **[Complete Framework Guide](./guides/complete-guide.md)**
  - Introduction
  - Core Concepts Deep Dive
  - Component Patterns in Detail
  - State Management Strategies
  - Control Flow Patterns
  - Routing Implementation
  - Data Fetching
  - Context & Dependency Injection
  - Performance Optimization
  - Testing
  - Best Practices

- **[Migration Guide](./guides/migration.md)**
  - From React
  - From Vue
  - From SolidJS
  - From Svelte
  - From Lit
  - From Angular
  - General Migration Tips
  - Common Gotchas

- **Routing** (Planned)
  - Router Setup
  - Route Configuration
  - Navigation
  - Route Parameters
  - Guards

- **Data Fetching** (Planned)
  - Resources
  - Manual Fetching
  - Loading States
  - Error Handling

- **Forms** (Planned)
  - Form Handling
  - Validation
  - Submission

- **SSR & Hydration** (Planned)
  - Server-Side Rendering
  - Hydration
  - SEO

- **Testing** (Planned)
  - Unit Testing
  - Integration Testing
  - E2E Testing

- **Performance** (Planned)
  - Optimization Techniques
  - Profiling
  - Bundle Size

- **Best Practices** (Planned)
  - Code Organization
  - Patterns
  - Anti-patterns

- **Examples** (Planned)
  - Real-world Applications
  - Common Patterns
  - Code Snippets

## 🔧 Reference Materials

- **[Quick Reference](./QUICK_REFERENCE.md)**
  - Core Primitives
  - Components
  - Control Flow
  - Context
  - Lifecycle
  - Common Patterns

- **[Documentation Summary](./DOCUMENTATION_SUMMARY.md)**
  - Structure Overview
  - Coverage Statistics
  - Key Features
  - Learning Paths

- **[Documentation Status](./DOCUMENTATION_STATUS.md)**
  - Completed Sections
  - In Progress
  - Planned
  - Metrics

- **[Framework Overview](./index.md)**
  - Introduction
  - Key Features
  - Architecture
  - Philosophy
  - Comparison

- **[Documentation Guide](./README.md)**
  - Navigation Help
  - Learning Paths
  - Quick Navigation
  - External Resources

## 📊 Documentation Statistics

- **Total Files**: 15 created
- **Total Words**: ~50,000+
- **Code Examples**: 400+
- **Completion**: ~25%
- **Coverage**: Core features fully documented

## 🎓 Recommended Reading Paths

### For Beginners (Complete)
1. [Installation](./getting-started/installation.md)
2. [Quick Start](./getting-started/quick-start.md)
3. [Signals](./core-concepts/signals.md)
4. [Components Overview](./components/overview.md)

### For Intermediate (Partial)
1. [Effects](./core-concepts/effects.md)
2. [Show Component](./control-flow/show.md)
3. [Complete Guide](./guides/complete-guide.md)

### For Migration (Complete)
1. [Migration Guide](./guides/migration.md) - Choose your framework
2. [Quick Start](./getting-started/quick-start.md)
3. [Core API](./api-reference/core.md)

### For Reference (Complete)
1. [API Reference](./api-reference/core.md)
2. [Quick Reference](./QUICK_REFERENCE.md)

## 🔍 Find What You Need

### I want to...
- **Get started** → [Installation](./getting-started/installation.md)
- **Build my first app** → [Quick Start](./getting-started/quick-start.md)
- **Learn reactivity** → [Signals](./core-concepts/signals.md), [Effects](./core-concepts/effects.md)
- **Create components** → [Components Overview](./components/overview.md)
- **Add conditions** → [Show Component](./control-flow/show.md)
- **See all APIs** → [Core API](./api-reference/core.md)
- **Migrate from X** → [Migration Guide](./guides/migration.md)
- **Get a quick lookup** → [Quick Reference](./QUICK_REFERENCE.md)

## 📞 Help & Support

- **GitHub**: [github.com/adafri/kettlejs](https://github.com/adafri/kettlejs)
- **Discord**: Community server
- **Stack Overflow**: Tag with `kettlejs`
- **Twitter**: [@KettleJS](https://twitter.com/kettlejs)

---

**Documentation Version**: 1.0.0  
**Framework Version**: 0.0.1  
**Last Updated**: 2024

Built with ☕ by the Adafri team
