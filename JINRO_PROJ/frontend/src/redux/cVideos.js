import { createSlice } from "@reduxjs/toolkit";

const cVideosSlice = createSlice({
  name: "cVideos",
  initialState: [],

  reducers: {
    addVideo: (state, action) => {
      const newVideos = action.payload;

      newVideos.forEach((video) => {
        const exists = state.find((v) => v.id === video.id);

        if (!exists) {
          state.push(video);
        }
      });
    },

    deleteVideo: (state, action) => {
      return state.filter(
        (video) => video.id !== action.payload
      );
    },

    clearVideos: () => {
      return [];
    }
  }
});

export const { addVideo, deleteVideo, clearVideos } = cVideosSlice.actions;

export default cVideosSlice.reducer;