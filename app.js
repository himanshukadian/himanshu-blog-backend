const express = require('express');
const cors = require('cors');
const articleRoutes = require('./routes/articleRoutes');
const tagRoutes = require('./routes/tagRoutes');
const typeRoutes = require('./routes/typeRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const authController = require('./controllers/authController');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/articles', articleRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/types', typeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
// app.post('/api/auth/register', authController.register); // Registration disabled after first admin
app.post('/api/auth/login', authController.login);

module.exports = app; 