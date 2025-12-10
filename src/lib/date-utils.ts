/**
 * Date utility functions for consistent date formatting across the application
 */

/**
 * Format a date string to YYYY-MM-DD format
 */
export const formatSimpleDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

/**
 * Format a date string to relative time format (Today, Yesterday, X days ago, etc.)
 */
export const formatRelativeDate = (dateString: string): string => {
  const reviewDate = new Date(dateString);
  const today = new Date();
  const diffTime = today.getTime() - reviewDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays <= 6) return `${diffDays} days ago`;
  if (diffWeeks >= 1 && diffWeeks <= 4) return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
  if (diffMonths >= 1 && diffMonths <= 11) return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
  if (diffYears >= 1) return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
  
  return "Recently";
};