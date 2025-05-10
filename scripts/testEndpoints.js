const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
let authToken = null;
let userId = null;
let articleId = null;
let typeId = null;

// Test user data
const testUser = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  password: 'test123456',
  passwordConfirm: 'test123456',
  role: 'admin'
};

// Test type data
const testType = {
  name: `Test Type ${Date.now()}`,
  description: 'This is a test type'
};

// Test article data
const testArticle = {
  title: 'Test Article',
  content: 'This is a test article content',
  excerpt: 'This is a test article excerpt',
  status: 'published',
  seo: {
    title: 'Test Article',
    description: 'This is a test article',
    keywords: ['test', 'article']
  },
  stats: {
    views: 0,
    likes: 0,
    shares: 0,
    comments: 0
  },
  readingTime: 1,
  featured: false,
  skipSlugify: true  // Add flag to prevent auto-slug generation
};

// Helper function to make authenticated requests
const makeAuthRequest = async (method, endpoint, data = null) => {
  const config = {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  };
  
  try {
    if (method === 'GET') {
      return await axios.get(`${API_URL}${endpoint}`, config);
    } else if (method === 'POST') {
      return await axios.post(`${API_URL}${endpoint}`, data, config);
    } else if (method === 'PATCH') {
      return await axios.patch(`${API_URL}${endpoint}`, data, config);
    } else if (method === 'DELETE') {
      return await axios.delete(`${API_URL}${endpoint}`, config);
    }
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

// Test authentication endpoints
const testAuth = async () => {
  console.log('\n=== Testing Authentication ===');
  
  try {
    // Test signup
    console.log('\nTesting signup...');
    const signupResponse = await axios.post(`${API_URL}/auth/signup`, testUser);
    console.log('✅ Signup successful');
    authToken = signupResponse.data.token;
    
    // Test login
    console.log('\nTesting login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful');
    authToken = loginResponse.data.token;
    
    // Test get current user
    console.log('\nTesting get current user...');
    const meResponse = await makeAuthRequest('GET', '/auth/me');
    userId = meResponse.data.data.user._id;
    console.log('✅ Get current user successful');
    
  } catch (error) {
    console.error('❌ Auth tests failed:', error.response?.data || error.message);
    throw error;
  }
};

// Test type endpoints
const testTypes = async () => {
  console.log('\n=== Testing Type Endpoints ===');
  
  try {
    // Test create type
    console.log('\nTesting create type...');
    const createResponse = await makeAuthRequest('POST', '/types', testType);
    typeId = createResponse.data.data._id;
    console.log('✅ Create type successful');
    
    // Add type to test article
    testArticle.type = typeId;
    
  } catch (error) {
    console.error('❌ Type tests failed:', error.response?.data || error.message);
    throw error;
  }
};

// Test article endpoints
const testArticles = async () => {
  console.log('\n=== Testing Article Endpoints ===');
  
  try {
    // Create test article with required fields
    const timestamp = Date.now();
    const articleSlug = `test-article-${timestamp}`;  // Store slug for later use
    const articleData = {
      ...testArticle,
      type: typeId,  // Required field
      author: userId,  // Required field
      slug: articleSlug,  // Unique slug
      title: `Test Article ${timestamp}`  // Unique title
    };
    
    // Test create article
    console.log('\nTesting create article...');
    console.log('Article data:', articleData);
    const createResponse = await makeAuthRequest('POST', '/articles', articleData);
    console.log('Response:', createResponse.data);
    articleId = createResponse.data.data._id;  // Store ID for later use
    console.log('✅ Create article successful');
    
    // Test get all articles
    console.log('\nTesting get all articles...');
    const getAllResponse = await makeAuthRequest('GET', '/articles');
    console.log('✅ Get all articles successful');
    
    // Test get single article
    console.log('\nTesting get single article...');
    const getOneResponse = await makeAuthRequest('GET', `/articles/${articleSlug}`);  // Use slug for get
    console.log('✅ Get single article successful');
    
    // Test update article
    console.log('\nTesting update article...');
    const updateData = {
      title: `Updated Test Article ${timestamp}`,
      content: 'Updated test article content'
    };
    console.log('Update data:', updateData);
    const updateResponse = await makeAuthRequest('PUT', `/articles/${articleId}`, updateData);  // Changed to PUT and correct path
    console.log('✅ Update article successful');
    
    // Test delete article
    console.log('\nTesting delete article...');
    const deleteResponse = await makeAuthRequest('DELETE', `/articles/${articleId}`);  // Changed to correct path
    console.log('✅ Delete article successful');
    
  } catch (error) {
    console.error('❌ Article tests failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('Detailed error:', error.response.data.error);
    }
    throw error;
  }
};

// Test comment endpoints
const testComments = async () => {
  console.log('\n=== Testing Comment Endpoints ===');
  
  try {
    // Create a new article for testing comments
    const timestamp = Date.now();
    const articleSlug = `test-article-comments-${timestamp}`;
    const articleData = {
      ...testArticle,
      type: typeId,
      author: userId,
      slug: articleSlug,
      title: `Test Article for Comments ${timestamp}`
    };
    const articleResponse = await makeAuthRequest('POST', '/articles', articleData);
    const testArticleId = articleResponse.data.data._id;
    
    // Test create comment
    console.log('\nTesting create comment...');
    const createResponse = await makeAuthRequest('POST', `/articles/${testArticleId}/comments`, {
      content: 'This is a test comment'
    });
    const commentId = createResponse.data.data._id;
    console.log('✅ Create comment successful');
    
    // Test get all comments
    console.log('\nTesting get all comments...');
    const getAllResponse = await makeAuthRequest('GET', `/articles/${testArticleId}/comments`);
    console.log('✅ Get all comments successful');
    
    // Test update comment
    console.log('\nTesting update comment...');
    const updateResponse = await makeAuthRequest('PUT', `/articles/${testArticleId}/comments/${commentId}`, {
      content: 'This is an updated test comment'
    });
    console.log('✅ Update comment successful');
    
    // Test delete comment
    console.log('\nTesting delete comment...');
    const deleteResponse = await makeAuthRequest('DELETE', `/articles/${testArticleId}/comments/${commentId}`);
    console.log('✅ Delete comment successful');
    
    // Clean up test article
    await makeAuthRequest('DELETE', `/articles/${testArticleId}`);
    
  } catch (error) {
    console.error('❌ Comment tests failed:', error.response?.data || error.message);
    throw error;
  }
};

// Run all tests
const runTests = async () => {
  try {
    await testAuth();
    await testTypes();
    await testArticles();
    await testComments();
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
};

// Start tests
runTests(); 