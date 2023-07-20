import { configureStore } from "@reduxjs/toolkit";
import comparisonInsight from "./store/comparisonInsight";

export const store = configureStore({
  reducer: {
    comparisonInsight,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
