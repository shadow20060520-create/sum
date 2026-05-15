/**
 * 舌位教学视频映射表
 * 根据错误拼音映射到对应的教学视频 URL
 */

export const VideoMapping = {
  // ========== 声母 (Initials) ==========
  // 真实测试视频：声母 b
  "b": "https://wvxmdyknrdpbtmpawwzn.supabase.co/storage/v1/object/public/pronunciation-videos/shengmu_b.mp4",
  
  // 占位链接，后续替换为真实视频
  "p": "https://www.w3schools.com/html/mov_bbb.mp4",
  "m": "https://www.w3schools.com/html/mov_bbb.mp4",
  "f": "https://www.w3schools.com/html/mov_bbb.mp4",
  "d": "https://www.w3schools.com/html/mov_bbb.mp4",
  "t": "https://www.w3schools.com/html/mov_bbb.mp4",
  "n": "https://www.w3schools.com/html/mov_bbb.mp4",
  "l": "https://www.w3schools.com/html/mov_bbb.mp4",
  "g": "https://www.w3schools.com/html/mov_bbb.mp4",
  "k": "https://www.w3schools.com/html/mov_bbb.mp4",
  "h": "https://www.w3schools.com/html/mov_bbb.mp4",
  "j": "https://www.w3schools.com/html/mov_bbb.mp4",
  "q": "https://www.w3schools.com/html/mov_bbb.mp4",
  "x": "https://www.w3schools.com/html/mov_bbb.mp4",
  "zh": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ch": "https://www.w3schools.com/html/mov_bbb.mp4",
  "sh": "https://www.w3schools.com/html/mov_bbb.mp4",
  "r": "https://www.w3schools.com/html/mov_bbb.mp4",
  "z": "https://www.w3schools.com/html/mov_bbb.mp4",
  "c": "https://www.w3schools.com/html/mov_bbb.mp4",
  "s": "https://www.w3schools.com/html/mov_bbb.mp4",
  "y": "https://www.w3schools.com/html/mov_bbb.mp4",
  "w": "https://www.w3schools.com/html/mov_bbb.mp4",
  
  // ========== 韵母 (Finals) ==========
  "a": "https://www.w3schools.com/html/mov_bbb.mp4",
  "o": "https://www.w3schools.com/html/mov_bbb.mp4",
  "e": "https://www.w3schools.com/html/mov_bbb.mp4",
  "i": "https://www.w3schools.com/html/mov_bbb.mp4",
  "u": "https://www.w3schools.com/html/mov_bbb.mp4",
  "v": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ai": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ei": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ui": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ao": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ou": "https://www.w3schools.com/html/mov_bbb.mp4",
  "iu": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ie": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ve": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ue": "https://www.w3schools.com/html/mov_bbb.mp4",
  "an": "https://www.w3schools.com/html/mov_bbb.mp4",
  "en": "https://www.w3schools.com/html/mov_bbb.mp4",
  "in": "https://www.w3schools.com/html/mov_bbb.mp4",
  "un": "https://www.w3schools.com/html/mov_bbb.mp4",
  "vn": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ang": "https://www.w3schools.com/html/mov_bbb.mp4",
  "eng": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ing": "https://www.w3schools.com/html/mov_bbb.mp4",
  "ong": "https://www.w3schools.com/html/mov_bbb.mp4",
  
  // ========== 声调 (Tones) ==========
  "tone": "https://www.w3schools.com/html/mov_bbb.mp4",
  "tone1": "https://www.w3schools.com/html/mov_bbb.mp4",
  "tone2": "https://www.w3schools.com/html/mov_bbb.mp4",
  "tone3": "https://www.w3schools.com/html/mov_bbb.mp4",
  "tone4": "https://www.w3schools.com/html/mov_bbb.mp4",
};

/**
 * 根据拼音获取对应的教学视频 URL
 * @param {string} phoneme - 拼音（如 'b', 'zh', 'a'）
 * @returns {string|null} - 视频 URL 或 null
 */
export function getVideoUrl(phoneme) {
  if (!phoneme) return null;
  
  // 统一转换为小写
  const key = phoneme.toLowerCase().trim();
  
  return VideoMapping[key] || null;
}

/**
 * 从评测结果中提取错误拼音
 * @param {Object} evaluationResult - 讯飞评测结果
 * @returns {Array} - 错误拼音列表 [{ phoneme, type, word }]
 */
export function extractErrorPhonemes(evaluationResult) {
  if (!evaluationResult || !evaluationResult.words) {
    return [];
  }

  const errors = [];

  evaluationResult.words.forEach((word, index) => {
    // 检查是否有发音错误
    const hasError = word.dp_message !== '0' || (word.tone_score !== undefined && word.tone_score < 70);
    
    if (hasError && word.content) {
      // 提取声母和韵母（简化处理，实际可能需要更复杂的拼音解析）
      const char = word.content;
      
      // 这里假设 word 中有 phoneme 信息，如果没有则需要根据拼音规则解析
      // 简化示例：直接取第一个字符作为声母
      if (word.phoneme) {
        errors.push({
          phoneme: word.phoneme,
          type: word.phoneme_type || 'initial', // initial, final, tone
          word: char,
          wordIndex: index,
          score: word.total_score || 0,
        });
      }
    }
  });

  return errors;
}

/**
 * 获取推荐的视频列表（根据错误拼音）
 * @param {Object} evaluationResult - 讯飞评测结果
 * @returns {Array} - 推荐视频列表 [{ phoneme, type, url, word }]
 */
export function getRecommendedVideos(evaluationResult) {
  const errorPhonemes = extractErrorPhonemes(evaluationResult);
  
  return errorPhonemes.map(error => ({
    phoneme: error.phoneme,
    type: error.type,
    url: getVideoUrl(error.phoneme),
    word: error.word,
    score: error.score,
  })).filter(video => video.url !== null); // 只返回有视频的错误
}

export default VideoMapping;
