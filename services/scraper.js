const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const BLOGS_BASE_URL = 'https://beyondchats.com/blogs';

const getLastPageNumber = async () => {
  try {
    const response = await axios.get(BLOGS_BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const $ = cheerio.load(response.data);
    
    // Find pagination links and get the highest page number
    const paginationLinks = $('.pagination a, .page-numbers a');
    
    let maxPage = 1;
    
    paginationLinks.each((_, element) => {
      const text = $(element).text().trim();
      const href = $(element).attr('href');
      const pageNum = parseInt(text, 10);
      if (!isNaN(pageNum) && pageNum > maxPage) {
        maxPage = pageNum;
      }
    });
    
    // If still 1, try alternative pagination selectors
    if (maxPage === 1) {
      const altLinks = $('nav a, .nav-links a, [class*="pagination"] a');
      
      altLinks.each((_, element) => {
        const href = $(element).attr('href') || '';
        const text = $(element).text().trim();
        
        // Extract page number from href like /page/2/, /page/3/
        const pageMatch = href.match(/\/page\/(\d+)/);
        if (pageMatch) {
          const pageNum = parseInt(pageMatch[1], 10);
          if (pageNum > maxPage) {
            maxPage = pageNum;
          }
        }
      });
    }
    
    return maxPage;
  } catch (error) {
    logger.error('Error getting last page number:', error.message);
    throw error;
  }
};

const getArticlesFromPage = async (pageNumber) => {
  try {
    const url = pageNumber === 1 ? BLOGS_BASE_URL : `${BLOGS_BASE_URL}/page/${pageNumber}/`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const $ = cheerio.load(response.data);
    const articles = [];
    
    // Find all article containers
    const articleElements = $('.post-item, article, .blog-post, [class*="post"]');
    
    articleElements.each((_, element) => {
      const $article = $(element);
      
      // Extract title
      const titleElem = $article.find('h2 a, h3 a, .post-title a, [class*="title"] a').first();
      const title = titleElem.text().trim();
      const articleUrl = titleElem.attr('href');
      
      // Extract author
      const authorElem = $article.find('[class*="author"], .by-author, .author-name').first();
      const author = authorElem.text().trim() || 'Unknown';
      
      // Extract date
      const dateElem = $article.find('[class*="date"], time, .post-date').first();
      let dateText = dateElem.text().trim() || dateElem.attr('datetime');
      
      if (title && articleUrl) {
        articles.push({
          title,
          author,
          dateText,
          url: articleUrl.startsWith('http') ? articleUrl : `https://beyondchats.com${articleUrl}`,
        });
      }
    });
    
    // Remove duplicates based on URL
    const uniqueArticles = [];
    const seenUrls = new Set();
    
    for (const article of articles) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        uniqueArticles.push(article);
      }
    }
    
    return uniqueArticles;
  } catch (error) {
    logger.error('Error fetching articles from page:', error.message);
    throw error;
  }
};

const getArticleDetails = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const $ = cheerio.load(response.data);
    
    // Navigate the specific structure: div#content > div.e-con-inner > div.elementor-widget-theme-post-content
    let $contentDiv = $('#content .e-con-inner .elementor-widget-theme-post-content');
    
    if ($contentDiv.length === 0) {
      $contentDiv = $('#content');
    }
    
    // Last fallback
    if ($contentDiv.length === 0) {
      $contentDiv = $('article').first();
    }
    
    let sections = [];
    let introductionParagraphs = [];
    let parsedContent = '';
    let rawContent = '';
    
    if ($contentDiv.length > 0) {
      // Clone to work with
      const $clean = $contentDiv.clone();
      
      // Remove unwanted elements
      $clean.find(
        '.comments-area, ' +
        '.related-posts, ' +
        '.post-navigation, ' +
        '.author-box, ' +
        'footer, ' +
        '[class*="footer"], ' +
        '[class*="comment"], ' +
        'nav, ' +
        '.social-share'
      ).remove();
      
      // Save the cleaned raw HTML
      rawContent = $clean.html() || '';
      
      // Extract structured content
      // Strategy: Process each child element in order to maintain structure
      // When we hit a heading, save previous section and start a new one
      // Paragraphs, lists, blockquotes belong to the current section
      
      let currentSection = null;
      let foundFirstHeading = false;
      
      // Process all direct and nested content while maintaining hierarchy
      $clean.contents().each((_, node) => {
        const $node = $(node);
        const tagName = node.name ? node.name.toLowerCase() : '';
        
        // For text nodes, skip if empty
        if (node.type === 'text') {
          return;
        }
        
        let text = $node.text().trim();
        
        // Skip empty elements
        if (!text || text.length < 2) return;
        
        // Skip footer patterns
        const footerPatterns = [
          'BeyondChats', 'Contact Us', 'Features', 'Integrations',
          'RESOURCES', 'Products', 'Pricing', 'Startup', 'Standard',
          'Business', 'Enterprise', 'Case studies', 'Success stories',
          'All rights reserved', 'Post Comment', 'Required fields',
          'Website', 'Add Comment', 'Leave a Reply', 'Save my name'
        ];
        
        if (footerPatterns.some(p => text.includes(p))) {
          return;
        }
        
        // Heading tags = new section
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          foundFirstHeading = true;
          
          // Save previous section
          if (currentSection && currentSection.paragraphs.length > 0) {
            sections.push(currentSection);
          }
          
          // Start new section
          currentSection = {
            title: text,
            paragraphs: [],
          };
        }
        // Paragraph, blockquote, list = belongs to current section
        else if ((tagName === 'p' || tagName === 'blockquote' || tagName === 'ul' || tagName === 'ol') && currentSection) {
          // For lists, get all li items
          let contentText = text;
          if (tagName === 'ul' || tagName === 'ol') {
            // Get list items with bullet/number markers
            const items = [];
            $node.find('li').each((_, li) => {
              items.push($(li).text().trim());
            });
            contentText = items.join('\n• ');
          }
          
          if (contentText) {
            currentSection.paragraphs.push(contentText);
          }
        }
        // Content before first heading = introduction
        else if ((tagName === 'p' || tagName === 'blockquote' || tagName === 'ul' || tagName === 'ol') && !foundFirstHeading) {
          let contentText = text;
          if (tagName === 'ul' || tagName === 'ol') {
            const items = [];
            $node.find('li').each((_, li) => {
              items.push($(li).text().trim());
            });
            contentText = items.join('\n• ');
          }
          
          if (contentText) {
            introductionParagraphs.push(contentText);
          }
        }
      });
      
      // Save last section
      if (currentSection && currentSection.paragraphs.length > 0) {
        sections.push(currentSection);
      }
      
      // Add introduction at the beginning if exists
      if (introductionParagraphs.length > 0) {
        sections.unshift({
          title: 'Introduction',
          paragraphs: introductionParagraphs,
        });
      }
      
      // Build plain text content
      parsedContent = sections
        .map(s => [s.title, ...s.paragraphs].join('\n'))
        .join('\n\n');
    }
    
    // Extract publish date
    let publishedDate = new Date();
    const timeElement = $('time').first();
    if (timeElement.length > 0) {
      const dateAttr = timeElement.attr('datetime');
      if (dateAttr) {
        publishedDate = new Date(dateAttr);
      } else {
        const dateText = timeElement.text().trim();
        if (dateText) {
          publishedDate = new Date(dateText);
        }
      }
    }
    
    return {
      content: parsedContent || 'Content not available',
      sections: sections.length > 0 ? sections : [],
      rawContent: rawContent,
      publishedDate,
    };
  } catch (error) {
    logger.error('Error fetching article details:', error.message);
    throw error;
  }
};

const scrapeLastPageArticles = async (limit = 5) => {
  try {
    const lastPage = await getLastPageNumber();
    const pageArticles = await getArticlesFromPage(lastPage);
    
    const articlesToFetch = pageArticles.slice(0, limit);
    const completeArticles = [];
    
    for (const article of articlesToFetch) {
      try {
        const details = await getArticleDetails(article.url);
        completeArticles.push({
          ...article,
          ...details,
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        // Continue with other articles
      }
    }
    
    return completeArticles;
  } catch (error) {
    logger.error('Error scraping last page articles:', error.message);
    throw error;
  }
};

const scrapeOldestPageArticles = async (limit = 5) => {
  try {
    const lastPage = await getLastPageNumber();
    
    const completeArticles = [];
    let currentPage = lastPage;
    let articlesNeeded = limit;
    let isFirstPage = true;
    
    // Start from last page and work backwards if needed
    while (articlesNeeded > 0 && currentPage >= 1) {
      const pageArticles = await getArticlesFromPage(currentPage);
      
      // On the last page, take from beginning
      // On previous pages, take from the end (those are the oldest on that page)
      let articlesToFetch;
      if (isFirstPage) {
        // First page (last page number) - take from start
        articlesToFetch = pageArticles.slice(0, Math.min(articlesNeeded, pageArticles.length));
        isFirstPage = false;
      } else {
        // Previous pages - take from end (last N articles)
        articlesToFetch = pageArticles.slice(-Math.min(articlesNeeded, pageArticles.length));
      }
      
      for (const article of articlesToFetch) {
        try {
          const details = await getArticleDetails(article.url);
          completeArticles.push({
            ...article,
            ...details,
          });
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          // Continue with other articles
        }
      }
      
      // Update how many more articles we need
      articlesNeeded -= articlesToFetch.length;
      
      // Move to previous page if we need more articles
      if (articlesNeeded > 0) {
        currentPage--;
        console.log(`[DEBUG] Moving to page ${currentPage} to get more articles`);
      }
    }
    
    console.log(`[DEBUG] Completed scraping. Total articles: ${completeArticles.length}`);
    return completeArticles;
  } catch (error) {
    console.log('[DEBUG] Error in scrapeOldestPageArticles:', error.message);
    logger.error('Error scraping oldest page articles:', error.message);
    throw error;
  }
};

module.exports = {
  getLastPageNumber,
  getArticlesFromPage,
  getArticleDetails,
  scrapeLastPageArticles,
  scrapeOldestPageArticles,
};
