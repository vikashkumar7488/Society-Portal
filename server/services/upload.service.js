/**
 * Optional image upload service. ImageKit is disabled in this project build.
 * Complaint creation and other API routes can run without ImageKit credentials.
 */

exports.getAuthenticationParameters = () => ({
  success: false,
  error: 'Image uploads are disabled because ImageKit is not configured.'
});

exports.deleteImage = async () => ({
  success: false,
  error: 'ImageKit is not configured.'
});

exports.getTransformedUrl = (path) => path;
