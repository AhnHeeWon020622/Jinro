import { configureStore } from '@reduxjs/toolkit';
import cVideos from './cVideos.js';
import { composeWithDevTools } from '@redux-devtools/extension';
import { applyMiddleware } from 'redux';


export const store = configureStore({
  reducer: {
    cVideos: cVideos,
  },
}, composeWithDevTools(
  applyMiddleware()
));