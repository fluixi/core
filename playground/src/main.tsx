import { render } from '@fluixi/core';
import { Playground } from './Playground';
import './styles.css';

const root = document.getElementById('playground-root');
if (root) render(() => <Playground />, root);
