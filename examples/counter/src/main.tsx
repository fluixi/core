import { render } from '@fluixi/kettlejs';
import { Counter } from './App';

const root = document.getElementById('app');
if (root) render(() => <Counter start={0} />, root);
