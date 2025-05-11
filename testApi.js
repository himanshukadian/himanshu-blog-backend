const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testApi() {
  try {
    console.log('Testing API endpoints...\n');

    // Test Courses
    console.log('1. Testing Courses:');
    console.log('-------------------');
    const courses = await axios.get(`${BASE_URL}/courses`);
    console.log('GET /courses:', courses.data);
    console.log('\n');

    // Test Sections for a Course
    console.log('2. Testing Sections for a Course:');
    console.log('--------------------------------');
    const courseSlug = courses.data.data[0]?.slug || 'system-design';
    const sections = await axios.get(`${BASE_URL}/courses/${courseSlug}/sections`);
    console.log(`GET /courses/${courseSlug}/sections:`, sections.data);
    console.log('\n');

    // Test Chapters for a Section
    console.log('3. Testing Chapters for a Section:');
    console.log('--------------------------------');
    const sectionSlug = sections.data.data[0]?.slug || 'load-balancer';
    const chapters = await axios.get(`${BASE_URL}/sections/${sectionSlug}/chapters`);
    console.log(`GET /sections/${sectionSlug}/chapters:`, chapters.data);
    console.log('\n');

    // Test Scenes for a Chapter
    console.log('4. Testing Scenes for a Chapter:');
    console.log('--------------------------------');
    const chapterSlug = chapters.data.data[0]?.slug || 'load-balancer';
    const scenes = await axios.get(`${BASE_URL}/chapters/${chapterSlug}/scenes`);
    console.log(`GET /chapters/${chapterSlug}/scenes:`, scenes.data);
    console.log('\n');

    // Test Individual Resources
    console.log('5. Testing Individual Resources:');
    console.log('-------------------------------');
    
    // Get specific course
    const course = await axios.get(`${BASE_URL}/courses/${courseSlug}`);
    console.log(`GET /courses/${courseSlug}:`, course.data);
    console.log('\n');

    // Get specific section
    const section = await axios.get(`${BASE_URL}/sections/${sectionSlug}`);
    console.log(`GET /sections/${sectionSlug}:`, section.data);
    console.log('\n');

    // Get specific chapter
    const chapter = await axios.get(`${BASE_URL}/chapters/${chapterSlug}`);
    console.log(`GET /chapters/${chapterSlug}:`, chapter.data);
    console.log('\n');

    // Get specific scene if available
    if (scenes.data.data && scenes.data.data.length > 0) {
      const sceneId = scenes.data.data[0]._id;
      const scene = await axios.get(`${BASE_URL}/scenes/${sceneId}`);
      console.log(`GET /scenes/${sceneId}:`, scene.data);
      console.log('\n');
    }

    console.log('All tests completed successfully! 🎉');

  } catch (error) {
    console.error('Error testing API:', error.response?.data || error.message);
  }
}

// Run the tests
testApi(); 