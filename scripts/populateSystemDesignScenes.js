const mongoose = require('mongoose');
require('dotenv').config();
const Scene = require('../models/Scene');
const Chapter = require('../models/Chapter');

const customChapterOrder = [
    'Load Balancer',
    'Caching',
    'CDN',
    'Database',
    'Message Queue'
];

// Helper function to create slug
function createSlug(name) {
    return name.toLowerCase().replace(/\s+/g, '-');
}

const systemDesignScenes = [
    // Load Balancer Chapter
    {
        title: "Introduction to Load Balancers",
        chapter: "Load Balancer",
        dialogue: "Load balancers distribute incoming network traffic across multiple servers to ensure no single server becomes overwhelmed.",
        drawFunction: "draw load balancer",
        order: 1,
        clearBeforeDraw: true
    },
    {
        title: "Types of Load Balancers",
        chapter: "Load Balancer",
        dialogue: "There are several types of load balancers: Layer 4 (Transport) and Layer 7 (Application) load balancers.",
        draw: (ctx) => {
            // Draw load balancer types
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#2563eb';
            
            // Layer 4
            ctx.strokeRect(40, 40, 120, 60);
            ctx.fillText('Layer 4', 60, 75);
            ctx.fillText('(Transport)', 50, 95);
            
            // Layer 7
            ctx.strokeRect(40, 120, 120, 60);
            ctx.fillText('Layer 7', 60, 155);
            ctx.fillText('(Application)', 45, 175);
            
            // Draw features
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#059669';
            ctx.fillText('• TCP/UDP', 180, 75);
            ctx.fillText('• IP-based', 180, 95);
            ctx.fillText('• HTTP/HTTPS', 180, 155);
            ctx.fillText('• URL-based', 180, 175);
        },
        order: 2,
        clearBeforeDraw: false
    },
    {
        title: "Load Balancing Algorithms",
        chapter: "Load Balancer",
        dialogue: "Common algorithms include Round Robin, Least Connections, and IP Hash.",
        draw: (ctx) => {
            // Draw algorithms
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#2563eb';
            
            // Round Robin
            ctx.strokeRect(40, 40, 120, 60);
            ctx.fillText('Round Robin', 50, 75);
            
            // Least Connections
            ctx.strokeRect(40, 120, 120, 60);
            ctx.fillText('Least', 60, 145);
            ctx.fillText('Connections', 50, 165);
            
            // IP Hash
            ctx.strokeRect(40, 200, 120, 60);
            ctx.fillText('IP Hash', 60, 235);
            
            // Draw descriptions
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#059669';
            ctx.fillText('• Sequential', 180, 75);
            ctx.fillText('• Equal distribution', 180, 95);
            ctx.fillText('• Based on active', 180, 145);
            ctx.fillText('connections', 180, 165);
            ctx.fillText('• Client IP based', 180, 235);
            ctx.fillText('• Sticky sessions', 180, 255);
        },
        order: 3,
        clearBeforeDraw: false
    },

    // Caching Chapter
    {
        title: "Introduction to Caching",
        chapter: "Caching",
        dialogue: "Caching stores frequently accessed data in memory for faster retrieval.",
        drawFunction: "draw cache",
        order: 1,
        clearBeforeDraw: true
    },
    {
        title: "Cache Types",
        chapter: "Caching",
        dialogue: "Different types of caches: Browser Cache, CDN Cache, Application Cache, and Database Cache.",
        drawFunction: "draw cache types",
        order: 2,
        clearBeforeDraw: false
    },
    {
        title: "Cache Strategies",
        chapter: "Caching",
        dialogue: "Common strategies include Cache-Aside, Read-Through, Write-Through, and Write-Behind.",
        drawFunction: "draw cache strategies",
        order: 3,
        clearBeforeDraw: false
    },

    // CDN Chapter
    {
        title: "Introduction to CDN",
        chapter: "CDN",
        dialogue: "Content Delivery Networks distribute content across multiple servers worldwide to reduce latency.",
        drawFunction: "draw cdn",
        order: 1,
        clearBeforeDraw: true
    },
    {
        title: "CDN Architecture",
        chapter: "CDN",
        dialogue: "CDNs use edge servers, origin servers, and a global network to deliver content efficiently.",
        drawFunction: "draw cdn architecture",
        order: 2,
        clearBeforeDraw: false
    },
    {
        title: "CDN Benefits",
        chapter: "CDN",
        dialogue: "Benefits include reduced latency, bandwidth savings, and improved security.",
        drawFunction: "draw cdn benefits",
        order: 3,
        clearBeforeDraw: false
    },

    // Database Chapter
    {
        title: "Database Types",
        chapter: "Database",
        dialogue: "Understanding SQL and NoSQL databases and their use cases.",
        drawFunction: "draw database types",
        order: 1,
        clearBeforeDraw: true
    },
    {
        title: "Database Scaling",
        chapter: "Database",
        dialogue: "Vertical and horizontal scaling strategies for databases.",
        drawFunction: "draw database scaling",
        order: 2,
        clearBeforeDraw: false
    },
    {
        title: "Database Replication",
        chapter: "Database",
        dialogue: "Master-slave replication and its role in high availability.",
        drawFunction: "draw database replication",
        order: 3,
        clearBeforeDraw: false
    },

    // Message Queue Chapter
    {
        title: "Introduction to Message Queues",
        chapter: "Message Queue",
        dialogue: "Message queues enable asynchronous communication between services.",
        drawFunction: "draw message queue",
        order: 1,
        clearBeforeDraw: true
    },
    {
        title: "Message Queue Patterns",
        chapter: "Message Queue",
        dialogue: "Common patterns include publish-subscribe and point-to-point messaging.",
        drawFunction: "draw message queue patterns",
        order: 2,
        clearBeforeDraw: false
    },
    {
        title: "Message Queue Benefits",
        chapter: "Message Queue",
        dialogue: "Benefits include decoupling, reliability, and scalability.",
        drawFunction: "draw message queue benefits",
        order: 3,
        clearBeforeDraw: false
    }
];

async function populateScenes() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Drop the name index if it exists
        try {
            await Chapter.collection.dropIndex('name_1');
            console.log('Dropped name index');
        } catch (error) {
            console.log('No name index to drop');
        }

        // Clear existing data
        await Chapter.deleteMany({});
        await Scene.deleteMany({});
        console.log('Cleared existing data');

        // Create chapters with slugs
        const chapterDocs = customChapterOrder.map((name, index) => ({
            title: name,
            slug: createSlug(name),
            order: index + 1,
            course: 'system-design'
        }));

        const chapters = await Chapter.insertMany(chapterDocs);
        console.log('Created chapters');

        // Create a map of chapter names to their IDs
        const chapterMap = {};
        chapters.forEach(chapter => {
            chapterMap[chapter.title] = chapter._id;
        });

        // Add chapterId to scenes
        const scenesWithChapterIds = systemDesignScenes.map(scene => ({
            ...scene,
            chapterId: chapterMap[scene.chapter]
        }));

        // Insert scenes
        await Scene.insertMany(scenesWithChapterIds);
        console.log('Successfully populated system design scenes');

        // Verify the scenes
        const scenes = await Scene.find().sort({ chapterId: 1, order: 1 }).populate('chapterId');
        console.log('\nPopulated Scenes:');
        scenes.forEach(scene => {
            console.log(`Chapter: ${scene.chapterId.title} (${scene.chapterId.slug}), Order: ${scene.order}, Title: ${scene.title}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

populateScenes(); 