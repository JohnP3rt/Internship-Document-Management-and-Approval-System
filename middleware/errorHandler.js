const multer = require('multer');

const errorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.redirect('back?error=File is too large. Maximum size is 5MB');
        }
        return res.redirect('back?error=Error uploading file: ' + err.message);
    }

    if (err.name === 'ValidationError') {
        return res.redirect('back?error=' + err.message);
    }

    return res.redirect('back?error=Something went wrong! Please try again.');
};

module.exports = errorHandler;
