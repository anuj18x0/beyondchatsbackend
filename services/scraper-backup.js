// const axios = require('axios');
// const cheerio = require('cheerio');
// const logger = require('../utils/logger');

// const BLOGS_BASE_URL = 'https://beyondchats.com/blogs';

// const getLastPageNumber = async () => {
//   try {
//     const response = await axios.get(BLOGS_BASE_URL, {
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//       },
//     });
//     const $ = cheerio.load(response.data);
    
//     // Find pagination links and get the highest page number
//     const paginationLinks = $('.pagination a, .page-numbers a');
//     let maxPage = 1;
    
//     paginationLinks.each((_, element) => {
//       const text = $(element).text().trim();
//       const pageNum = parseInt(text, 10);
//       if (!isNaN(pageNum) && pageNum > maxPage) {
//         maxPage = pageNum;
//       }
//     });
    
//     logger.info(`Found last page number: ${maxPage}`);
//     return maxPage;
//   } catch (error) {
//     logger.error('Error getting last page number:', error.message);
//     throw error;
//   }
// };

// const getArticlesFromPage = async (pageNumber) => {
//   try {
//     const url = pageNumber === 1 ? BLOGS_BASE_URL : `${BLOGS_BASE_URL}/page/${pageNumber}/`;
//     logger.info(`Fetching articles from page: ${pageNumber}`);
    
//     const response = await axios.get(url, {
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//       },
//     });
    
//     const $ = cheerio.load(response.data);
//     const articles = [];
    
//     // Find all article containers
//     const articleElements = $('.post-item, article, .blog-post, [class*="post"]');
    
//     articleElements.each((_, element) => {
//       const $article = $(element);
      
//       // Extract title
//       const titleElem = $article.find('h2 a, h3 a, .post-title a, [class*="title"] a').first();
//       const title = titleElem.text().trim();
//       const articleUrl = titleElem.attr('href');
      
//       // Extract author
//       const authorElem = $article.find('[class*="author"], .by-author, .author-name').first();
//       const author = authorElem.text().trim() || 'Unknown';
      
//       // Extract date
//       const dateElem = $article.find('[class*="date"], time, .post-date').first();
//       let dateText = dateElem.text().trim() || dateElem.attr('datetime');
      
//       if (title && articleUrl) {
//         articles.push({
//           title,
//           author,
//           dateText,
//           url: articleUrl.startsWith('http') ? articleUrl : `https://beyondchats.com${articleUrl}`,
//         });
//       }
//     });
    
//     logger.info(`Found ${articles.length} articles on page ${pageNumber}`);
//     return articles;
//   } catch (error) {
//     logger.error('Error fetching articles from page:', error.message);
//     throw error;
//   }
// };

// const getArticleDetails = async (url) => {
//   try {
//     logger.info(`Fetching article details from: ${url}`);
    
//     const response = await axios.get(url, {
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//       },
//     });
    
//     const $ = cheerio.load(response.data);
    
//     // Try multiple selectors for content container
//     let contentDiv = $('#content');
//     if (contentDiv.length === 0) contentDiv = $('[id="content"]');
//     if (contentDiv.length === 0) contentDiv = $('.post-content, .entry-content, .content, .article-content, main article, article');
    
//     let contentHtml = '';
//     let parsedContent = '';
//     let sections = [];
    
//     if (contentDiv.length > 0) {
//       // Get the first matching element with actual content
//       const $content = contentDiv.eq(0);
//       contentHtml = $content.html() || '';
      
//       // Extract all h2, h3, h4 headings and p paragraphs
//       let currentSection = null;
//       let introductionParagraphs = [];
//       let foundFirstHeading = false;
      
//       $content.contents().each((_, node) => {
//         const $node = $(node);
        
//         // Skip empty text nodes
//         if (node.type === 'text') {
//           const text = $(node).text().trim();
//           if (!text) return;
//         }
        
//         const tagName = node.name ? node.name.toLowerCase() : '';
        
//         if (['h2', 'h3', 'h4', 'h5'].includes(tagName)) {
//           foundFirstHeading = true;
          
//           // Save previous section
//           if (currentSection && currentSection.paragraphs.length > 0) {
//             sections.push(currentSection);
//           }
          
//           // Start new section
//           const title = $node.text().trim();
//           currentSection = {
//             title: title,
//             paragraphs: [],
//           };
//         } else if (tagName === 'p') {
//           const text = $node.text().trim();
          
//           if (text && currentSection) {
//             // Add to current section
//             currentSection.paragraphs.push(text);
//           } else if (text && !foundFirstHeading) {
//             // Collect intro paragraphs before first heading
//             introductionParagraphs.push(text);
//           }
//         } else if (['blockquote', 'ul', 'ol'].includes(tagName)) {
//           // Handle blockquotes and lists as paragraphs
//           const text = $node.text().trim();
//           if (text && currentSection) {
//             currentSection.paragraphs.push(text);
//           }
//         }
//       });
      
//       // Save last section
//       if (currentSection && currentSection.paragraphs.length > 0) {
//         sections.push(currentSection);
//       }
      
//       // Add introduction if we have intro paragraphs
//       if (introductionParagraphs.length > 0) {
//         sections.unshift({
//           title: 'Introduction',
//           paragraphs: introductionParagraphs,
//         });
//       }
      
//       // Create plain text content for search/display
//       parsedContent = sections
//         .map(s => [s.title, ...s.paragraphs].join('\n'))
//         .join('\n\n');
//     }
    
//     // Fallback if no content found
//     if (sections.length === 0) {
//       logger.warn(`No sections extracted from ${url}, trying alternative selectors`);
      
//       // Try to extract from body with all p and h tags
//       const allContent = $('body');
//       let currentSection = null;
      
//       allContent.find('p, h2, h3, h4, h5, h6').each((_, el) => {
//         const $el = $(el);
//         const tag = el.name.toLowerCase();
//         const text = $el.text().trim();
        
//         if (!text) return;
        
//         if (['h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
//           if (currentSection && currentSection.paragraphs.length > 0) {
//             sections.push(currentSection);
//           }
//           currentSection = {
//             title: text,
//             paragraphs: [],
//           };
//         } else if (tag === 'p' && currentSection) {
//           currentSection.paragraphs.push(text);
//         }
//       });
      
//       if (currentSection && currentSection.paragraphs.length > 0) {
//         sections.push(currentSection);
//       }
      
//       parsedContent = sections
//         .map(s => [s.title, ...s.paragraphs].join('\n'))
//         .join('\n\n');
//     }
    
//     // Extract full article raw HTML
//     const fullArticleDiv = $('article').first();
//     const rawContent = fullArticleDiv.html() || $('main').html() || '';
    
//     // Extract publish date
//     let publishedDate = new Date();
//     const timeElement = $('time').first();
//     if (timeElement.length > 0) {
//       const dateAttr = timeElement.attr('datetime');
//       if (dateAttr) {
//         publishedDate = new Date(dateAttr);
//       } else {
//         const dateText = timeElement.text().trim();
//         if (dateText) publishedDate = new Date(dateText);
//       }
//     }
    
//     return {
//       content: parsedContent || 'Content not available',
//       sections: sections.length > 0 ? sections : [],
//       rawContent: rawContent,
//       publishedDate,
//     };
//   } catch (error) {
//     logger.error('Error fetching article details:', error.message);
//     throw error;
//   }
// };

// const scrapeLastPageArticles = async (limit = 5) => {
//   try {
//     logger.info(`Starting to scrape last page articles (limit: ${limit})`);
    
//     // Get last page number
//     const lastPage = await getLastPageNumber();
    
//     // Get articles from last page
//     const pageArticles = await getArticlesFromPage(lastPage);
    
//     // Limit to requested number and fetch full details for each
//     const articlesToFetch = pageArticles.slice(0, limit);
//     const completeArticles = [];
    
//     for (const article of articlesToFetch) {
//       try {
//         const details = await getArticleDetails(article.url);
//         completeArticles.push({
//           ...article,
//           ...details,
//         });
//         // Small delay to avoid rate limiting
//         await new Promise(resolve => setTimeout(resolve, 500));
//       } catch (error) {
//         logger.warn(`Failed to get details for article: ${article.title}`, error.message);
//       }
//     }
    
//     logger.info(`Successfully scraped ${completeArticles.length} complete articles`);
//     return completeArticles;
//   } catch (error) {
//     logger.error('Error scraping last page articles:', error.message);
//     throw error;
//   }
// };

// module.exports = {
//   getLastPageNumber,
//   getArticlesFromPage,
//   getArticleDetails,
//   scrapeLastPageArticles,
// };
