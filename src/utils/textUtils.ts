
export const countWords = (text: string): number => {
  if (!text || text.trim() === '') {
    return 0;
  }
  // Simple word count based on spaces. Can be refined later if needed.
  return text.trim().split(/\s+/).length;
};
