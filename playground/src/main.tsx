import { render } from 'fluixi';
import { Playground } from './Playground';
import './styles.css';

const root = document.getElementById('app');
if (root) render(() => <Playground />, root);
