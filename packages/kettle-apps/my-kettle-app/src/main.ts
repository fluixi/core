import { render } from '@awc/kettlejs';
import { App } from './App.js';
import './styles/main.css';

const root = document.getElementById('app');

if (root) {
  render(App, root);
}
