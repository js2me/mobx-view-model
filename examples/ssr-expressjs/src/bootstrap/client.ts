import { configure } from 'mobx';
import { enableStaticRendering } from 'mobx-react-lite';

configure({ enforceActions: 'always' });

enableStaticRendering(typeof window === 'undefined');
