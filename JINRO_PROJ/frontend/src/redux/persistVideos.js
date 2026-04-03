export const loadVideos = () => {
  try {
    const data = localStorage.getItem("selectedVideos");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveVideos = (videos) => {
  localStorage.setItem("selectedVideos", JSON.stringify(videos));
};

// cVideos.js에서 더이상 사용하지 않으므로 파일 자체 삭제해도 됨.