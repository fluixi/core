import { render } from '@fluixi/kettlejs';
import { TodoApp } from './App';

const root = document.getElementById('app');
if (root) render(() => <TodoApp />, root);
