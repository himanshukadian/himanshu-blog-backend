const axios = require('axios');

async function testGetScenesByChapter() {
    try {
        // Test different chapters
        const chapters = [1, 2, 3];
        
        for (const chapter of chapters) {
            console.log(`\nTesting GET /api/scenes/chapter/${chapter}`);
            console.log('----------------------------------------');
            
            const response = await axios.get(`http://localhost:5000/api/scenes/chapter/${chapter}`);
            
            console.log('Status:', response.status);
            console.log('Data:', JSON.stringify(response.data, null, 2));
        }
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

// Run the test
testGetScenesByChapter(); 