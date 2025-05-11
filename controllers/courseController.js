const Course = require('../models/Course');

exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({});
    res.status(200).json({ status: 'success', data: courses });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getCourseBySlug = async (req, res) => {
  try {
    const { courseSlug } = req.params;
    const course = await Course.findOne({ slug: courseSlug });
    
    if (!course) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'Course not found' 
      });
    }

    res.status(200).json({ 
      status: 'success', 
      data: course 
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}; 