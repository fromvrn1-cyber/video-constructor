const API_BASE_URL = 'http://185.23.34.86';

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
};

export const getFileUrl = (filename) => {
  if (!filename) return '';
  if (filename.startsWith('http')) return filename;
  if (filename.startsWith('/uploads/')) return `${API_BASE_URL}${filename}`;
  return filename;
};