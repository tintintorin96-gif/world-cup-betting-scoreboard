import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import { createApp } from './app';

const root = document.getElementById('app');
if (root) createApp(root);
