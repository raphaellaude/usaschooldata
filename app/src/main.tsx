import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {RoomStateProvider} from '@sqlrooms/room-store';
import {roomStore} from './store';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RoomStateProvider roomStore={roomStore}>
      <App />
    </RoomStateProvider>
  </StrictMode>
);
