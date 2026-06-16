import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import { initGradientBackground } from './background/gradient-background';
import { createApp } from './app';

initGradientBackground();

const root = document.getElementById('app');
if (root) createApp(root);
