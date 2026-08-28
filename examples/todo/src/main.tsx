import { render } from 'fluixi';
import { TodoApp } from './App';

const root = document.getElementById('app');
if (root) render(() => <TodoApp />, root);
