// Wrapper function to catch async errors
exports.catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}; 