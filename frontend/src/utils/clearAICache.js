// Utility to clear AI Insights cache - run in browser console
// Clear all AI Insights related localStorage data

console.log('🧹 Clearing KMRL AI Insights cache...');

const keys = Object.keys(localStorage);
const aiKeys = keys.filter(key => key.includes('kmrl_ai_insights_data'));

aiKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`✅ Removed: ${key}`);
});

if (aiKeys.length === 0) {
  console.log('ℹ️  No AI Insights cache found');
} else {
  console.log(`🎉 Successfully cleared ${aiKeys.length} cache entries`);
  console.log('🔄 Please refresh the page to load fresh data');
}

// Also clear any other related caches
const relatedKeys = [
  'kmrl_optimization_cache',
  'kmrl_insights_temp',
  'ai_models_cache'
];

relatedKeys.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ Also removed: ${key}`);
  }
});

export const clearAIInsightsCache = () => {
  // Same function for programmatic use
  const keys = Object.keys(localStorage);
  const aiKeys = keys.filter(key => key.includes('kmrl_ai_insights_data'));
  
  aiKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  return aiKeys.length;
};